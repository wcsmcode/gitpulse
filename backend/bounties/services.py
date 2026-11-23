"""
GitHub REST API Synchronization Service for GitPulse (DevBounty).

Fetches repositories and issues from GitHub's REST API,
parses labels to infer bounty point rewards, and syncs
them into the local database idempotently.
"""

import json
import logging
import urllib.request
import urllib.error
from django.utils import timezone
from .models import Repository, Issue

logger = logging.getLogger('gitpulse.github')


class GitHubSyncService:
    """
    Service responsible for communicating with the GitHub REST API (v3)
    and synchronizing repository issues into GitPulse models.
    """

    DEFAULT_API_BASE = "https://api.github.com"

    def __init__(self, api_base=None, token=None):
        self.api_base = api_base or self.DEFAULT_API_BASE
        self.token = token

    def _get_headers(self):
        """Construct required headers for GitHub API requests."""
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitPulse-Sync-Service',
        }
        if self.token:
            headers['Authorization'] = f"token {self.token}"
        return headers

    def fetch_repo_data(self, owner_and_repo):
        """
        Fetch repository metadata from GitHub.
        :param owner_and_repo: string e.g. "facebook/react" or "gitpulse-dev/gitpulse"
        """
        url = f"{self.api_base}/repos/{owner_and_repo}"
        req = urllib.request.Request(url, headers=self._get_headers())
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = response.read().decode('utf-8')
                    return json.loads(data)
        except urllib.error.HTTPError as e:
            logger.error(f"GitHub API HTTPError {e.code} for repo {owner_and_repo}: {e.reason}")
            raise
        except urllib.error.URLError as e:
            logger.error(f"GitHub API URLError for repo {owner_and_repo}: {e.reason}")
            raise

    def fetch_issues_data(self, owner_and_repo, state='open', per_page=30):
        """
        Fetch list of issues from GitHub.
        """
        url = f"{self.api_base}/repos/{owner_and_repo}/issues?state={state}&per_page={per_page}"
        req = urllib.request.Request(url, headers=self._get_headers())
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = response.read().decode('utf-8')
                    # Filter out Pull Requests (GitHub issues API includes PRs)
                    raw_items = json.loads(data)
                    return [item for item in raw_items if 'pull_request' not in item]
        except urllib.error.HTTPError as e:
            logger.error(f"GitHub API HTTPError {e.code} for issues in {owner_and_repo}: {e.reason}")
            raise
        except urllib.error.URLError as e:
            logger.error(f"GitHub API URLError for issues in {owner_and_repo}: {e.reason}")
            raise

    @staticmethod
    def calculate_bounty_points(labels):
        """
        Inspect issue labels and assign bounty XP accordingly.

        Rules:
        - "bounty:XXX" label -> explicit XXX points
        - "critical" / "security" -> 500 XP
        - "bug" / "high-priority" -> 250 XP
        - "good first issue" / "help wanted" -> 150 XP
        - Default -> 100 XP
        """
        label_names = [l.get('name', '').lower() for l in labels]

        # Check for explicit bounty tag
        for name in label_names:
            if name.startswith('bounty:') or name.startswith('xp:'):
                try:
                    val = int(name.split(':')[1])
                    if val > 0:
                        return val
                except ValueError:
                    pass

        if any(w in label_names for w in ['critical', 'security', 'p0']):
            return 500
        if any(w in label_names for w in ['bug', 'defect', 'p1', 'high priority']):
            return 250
        if any(w in label_names for w in ['good first issue', 'help wanted', 'easy']):
            return 150

        return 100

    def sync_workspace_repository(self, workspace, repo_name, sync_user):
        """
        Create or update local Repository and sync active issues.
        """
        # Determine full repo path
        full_repo_path = repo_name
        if '/' not in repo_name and workspace.github_org:
            full_repo_path = f"{workspace.github_org}/{repo_name}"

        repo_info = self.fetch_repo_data(full_repo_path)
        issues_info = self.fetch_issues_data(full_repo_path)

        # Get or create repository record
        repository, _ = Repository.objects.update_or_create(
            workspace=workspace,
            name=repo_info.get('name', repo_name),
            defaults={
                'github_repo_id': repo_info.get('id'),
                'github_url': repo_info.get('html_url', f"https://github.com/{full_repo_path}"),
                'is_active': not repo_info.get('archived', False),
            }
        )

        synced_count = 0
        for item in issues_info:
            issue_number = item.get('number')
            title = item.get('title', f"Issue #{issue_number}")
            body = item.get('body') or ''
            labels = item.get('labels', [])
            points = self.calculate_bounty_points(labels)

            # Idempotently update or create issue
            issue, created = Issue.objects.update_or_create(
                repository=repository,
                github_issue_number=issue_number,
                defaults={
                    'title': title,
                    'description': body,
                    'bounty_points': points,
                    'creator': sync_user,
                    # Keep existing status/assignee if already claimed
                }
            )
            synced_count += 1

        return {
            'repository': repository,
            'synced_issues_count': synced_count,
            'github_url': repository.github_url
        }
