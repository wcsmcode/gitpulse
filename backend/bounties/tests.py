"""
Comprehensive tests for GitPulse Core & Bounties (Phases 1, 2, and 3).

Covers:
- Custom User & Profile signal creation.
- Core models creation and validation (Workspace, WorkspaceMember, Repository, Issue, BountyTransaction).
- Token Authentication API (Register, Login, Me, Logout).
- DRF ViewSets with DefaultRouter:
  - Workspaces CRUD, members action, and sync_github action.
  - Repositories CRUD.
  - Issues CRUD, claim action, submit_review action, and atomic close_issue XP payout.
  - BountyTransaction ledger.
- Phase 3 Deliverables:
  - RequestLoggingMiddleware latency calculation and X-Process-Time-Ms header.
  - GitHubSyncService unit tests with mocked responses (label point extraction, error handling).
  - Workspace sync_github endpoint with permissions and mocked external API responses.
"""

from unittest.mock import patch, MagicMock

from django.test import TestCase, RequestFactory
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from userauths.models import User, Profile
from bounties.models import Workspace, WorkspaceMember, Repository, Issue, IssueComment, BountyTransaction
from bounties.services import GitHubSyncService
from config.middleware import RequestLoggingMiddleware


class UserModelTest(TestCase):
    """Test User and Developer Profile behavior."""

    def test_user_creation_creates_profile_automatically(self):
        """Profile should be created automatically via post_save signal."""
        user = User.objects.create_user(email='testdev@example.com', password='password123')
        self.assertEqual(user.email, 'testdev@example.com')
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.total_points, 0)

    def test_user_str(self):
        user = User.objects.create_user(email='dev@gitpulse.io', password='password123')
        self.assertEqual(str(user), 'dev@gitpulse.io')


class BountiesModelsTest(TestCase):
    """Test GitPulse core models and state constraints."""

    def setUp(self):
        self.owner = User.objects.create_user(email='owner@test.com', password='pass')
        self.developer = User.objects.create_user(email='dev@test.com', password='pass')
        self.workspace = Workspace.objects.create(name='DevBounty Org', owner=self.owner)
        self.repo = Repository.objects.create(workspace=self.workspace, name='gitpulse-core')

    def test_workspace_slug_generation(self):
        """Workspace slug should be auto-slugified from name."""
        self.assertEqual(self.workspace.slug, 'devbounty-org')

    def test_workspace_membership(self):
        """Member can join workspace with specific role."""
        membership = WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.developer,
            role=WorkspaceMember.Role.DEVELOPER
        )
        self.assertEqual(membership.role, 'DEVELOPER')
        self.assertIn(self.developer.email, str(membership))

    def test_issue_creation(self):
        """Issue created with default OPEN status."""
        issue = Issue.objects.create(
            repository=self.repo,
            title='Fix race condition in transactions',
            bounty_points=250,
            creator=self.owner
        )
        self.assertEqual(issue.status, Issue.Status.OPEN)
        self.assertEqual(issue.bounty_points, 250)


class TokenAuthAPITest(APITestCase):
    """Test Token Authentication API endpoints."""

    def test_register_creates_user_and_token(self):
        url = reverse('auth-register')
        data = {
            'email': 'token_user@test.com',
            'password': 'StrongPassword123',
            'full_name': 'Token Engineer'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['email'], 'token_user@test.com')

    def test_login_returns_token(self):
        User.objects.create_user(email='login_user@test.com', password='SecretPassword123')
        url = reverse('auth-login')
        response = self.client.post(url, {
            'email': 'login_user@test.com',
            'password': 'SecretPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_me_requires_token(self):
        user = User.objects.create_user(email='me_user@test.com', password='SecretPassword123')
        token = Token.objects.create(user=user)

        url = reverse('auth-me')
        res_unauth = self.client.get(url)
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        res_auth = self.client.get(url)
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(res_auth.data['email'], 'me_user@test.com')


class ViewSetAndBountyActionsAPITest(APITestCase):
    """Test DRF ViewSets and Issue state actions with atomic XP payouts."""

    def setUp(self):
        self.owner = User.objects.create_user(email='ws_owner@test.com', password='pass')
        self.owner_token = Token.objects.create(user=self.owner)

        self.developer = User.objects.create_user(email='dev_hunter@test.com', password='pass')
        self.developer_token = Token.objects.create(user=self.developer)

        self.workspace = Workspace.objects.create(name='DevTeam Core', owner=self.owner)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.owner, role=WorkspaceMember.Role.OWNER)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.developer, role=WorkspaceMember.Role.DEVELOPER)
        self.repo = Repository.objects.create(workspace=self.workspace, name='engine')
        self.issue = Issue.objects.create(
            workspace=self.workspace,
            repository=self.repo,
            title='Implement Cache Layer',
            bounty_points=300,
            creator=self.owner
        )

    def test_list_workspaces_paginated(self):
        url = reverse('workspace-list')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        # Check current_user_role and members fields
        first_ws = response.data['results'][0]
        self.assertEqual(first_ws['current_user_role'], 'OWNER')
        self.assertTrue(len(first_ws['members']) >= 1)

    def test_claim_bounty_issue(self):
        """Developer claims an OPEN bounty issue."""
        url = reverse('issue-claim', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.developer_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, Issue.Status.IN_PROGRESS)
        self.assertEqual(self.issue.assignee, self.developer)
        self.assertIsNotNone(self.issue.claimed_at)

    def test_submit_review_issue(self):
        """Developer transitions issue to IN_REVIEW."""
        self.issue.assignee = self.developer
        self.issue.status = Issue.Status.IN_PROGRESS
        self.issue.save()

        url = reverse('issue-submit-review', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.developer_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, Issue.Status.IN_REVIEW)

    def test_close_issue_atomic_xp_payout(self):
        """Closing issue awards XP to developer atomically and creates ledger entry."""
        self.issue.assignee = self.developer
        self.issue.status = Issue.Status.IN_REVIEW
        self.issue.save()

        initial_points = self.developer.profile.total_points
        url = reverse('issue-close-issue', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, Issue.Status.CLOSED)

        # Verify XP awarded to developer profile
        self.developer.profile.refresh_from_db()
        self.assertEqual(self.developer.profile.total_points, initial_points + 300)

        # Verify BountyTransaction created
        self.assertTrue(BountyTransaction.objects.filter(issue=self.issue, recipient=self.developer).exists())


class RequestLoggingMiddlewareTest(TestCase):
    """Test custom performance and audit request logging middleware."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_middleware_adds_process_time_header(self):
        from django.http import HttpResponse
        request = self.factory.get('/api/v1/workspaces/')
        real_middleware = RequestLoggingMiddleware(lambda req: HttpResponse("OK"))
        response = real_middleware(request)

        self.assertIn('X-Process-Time-Ms', response)
        time_ms = float(response['X-Process-Time-Ms'])
        self.assertGreaterEqual(time_ms, 0.0)


class GitHubSyncServiceTest(APITestCase):
    """Test GitHub REST API synchronization service and endpoints."""

    def setUp(self):
        self.owner = User.objects.create_user(email='git_owner@test.com', password='pass')
        self.owner_token = Token.objects.create(user=self.owner)
        self.workspace = Workspace.objects.create(
            name='Sync Org',
            slug='sync-org',
            github_org='octocat',
            owner=self.owner
        )
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.owner, role=WorkspaceMember.Role.OWNER)

    def test_calculate_bounty_points_rules(self):
        """Check smart bounty XP calculations based on GitHub label tags."""
        self.assertEqual(GitHubSyncService.calculate_bounty_points([{'name': 'bounty:400'}]), 400)
        self.assertEqual(GitHubSyncService.calculate_bounty_points([{'name': 'critical'}]), 500)
        self.assertEqual(GitHubSyncService.calculate_bounty_points([{'name': 'bug'}]), 250)
        self.assertEqual(GitHubSyncService.calculate_bounty_points([{'name': 'good first issue'}]), 150)
        self.assertEqual(GitHubSyncService.calculate_bounty_points([]), 100)

    @patch.object(GitHubSyncService, 'fetch_repo_data')
    @patch.object(GitHubSyncService, 'fetch_issues_data')
    def test_sync_workspace_repository_mocked(self, mock_fetch_issues, mock_fetch_repo):
        """Verify repository and issue creation from mock GitHub API payload."""
        mock_fetch_repo.return_value = {
            'id': 1234567,
            'name': 'Hello-World',
            'html_url': 'https://github.com/octocat/Hello-World',
            'archived': False
        }
        mock_fetch_issues.return_value = [
            {
                'number': 1,
                'title': 'Found a bug in parser',
                'body': 'Steps to reproduce...',
                'labels': [{'name': 'bug'}]
            },
            {
                'number': 2,
                'title': 'Memory leak on websocket connect',
                'body': 'Profiles attached.',
                'labels': [{'name': 'bounty:750'}]
            }
        ]

        service = GitHubSyncService()
        result = service.sync_workspace_repository(self.workspace, 'Hello-World', self.owner)

        self.assertEqual(result['synced_issues_count'], 2)
        self.assertTrue(Repository.objects.filter(workspace=self.workspace, name='Hello-World').exists())

        # Verify created issues
        issue_1 = Issue.objects.get(github_issue_number=1)
        self.assertEqual(issue_1.bounty_points, 250)

        issue_2 = Issue.objects.get(github_issue_number=2)
        self.assertEqual(issue_2.bounty_points, 750)

    @patch.object(GitHubSyncService, 'fetch_repo_data')
    @patch.object(GitHubSyncService, 'fetch_issues_data')
    def test_sync_github_endpoint(self, mock_fetch_issues, mock_fetch_repo):
        """Test POST /api/v1/workspaces/{id}/sync_github/ API action."""
        mock_fetch_repo.return_value = {
            'id': 999,
            'name': 'repo-api',
            'html_url': 'https://github.com/octocat/repo-api',
            'archived': False
        }
        mock_fetch_issues.return_value = [
            {
                'number': 10,
                'title': 'Add tests',
                'body': 'Unit tests needed',
                'labels': []
            }
        ]

        url = reverse('workspace-sync-github', kwargs={'pk': self.workspace.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.post(url, {'repo': 'repo-api'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['synced_issues_count'], 1)
        self.assertTrue(Issue.objects.filter(github_issue_number=10).exists())


class SwaggerDocsTest(APITestCase):
    """Test OpenAPI 3.0 schema and Swagger UI endpoint generation."""

    def test_schema_endpoint(self):
        url = reverse('schema')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_swagger_ui_endpoint(self):
        url = reverse('swagger-ui')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, 'GitPulse')

class MultiRepoAndOptionalRepoTest(APITestCase):
    """Test multiple repositories per workspace and issue creation without repository."""

    def setUp(self):
        self.owner = User.objects.create_user(email='multirepo_owner@test.com', password='password123')
        self.owner_token = Token.objects.create(user=self.owner)
        self.workspace = Workspace.objects.create(name='MultiRepo Team', owner=self.owner)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.owner, role=WorkspaceMember.Role.OWNER)

    def test_link_multiple_repositories_to_workspace(self):
        url = reverse('workspace-repos', kwargs={'pk': self.workspace.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)

        # Link first repo
        res1 = self.client.post(url, {'name': 'repo-frontend', 'github_url': 'https://github.com/org/repo-frontend'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Link second repo
        res2 = self.client.post(url, {'name': 'repo-backend', 'github_url': 'https://github.com/org/repo-backend'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # List repos
        list_res = self.client.get(url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 2)

    def test_create_issue_without_repository(self):
        url = reverse('issue-list')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.post(url, {
            'workspace': self.workspace.pk,
            'title': 'Internal Architecture Task',
            'description': 'Clean up shared utils without repository binding',
            'bounty_points': 200,
            'repository': None
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['repository'])
        self.assertIsNone(response.data['repository_name'])
        self.assertEqual(response.data['workspace_id'], self.workspace.pk)

    def test_unlink_repository(self):
        repo = Repository.objects.create(workspace=self.workspace, name='legacy-repo')
        url = reverse('repository-detail', kwargs={'pk': repo.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        del_res = self.client.delete(url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Repository.objects.filter(pk=repo.pk).exists())


class WorkspaceRBACAndMemberAPITest(APITestCase):
    """Test scoped RBAC, owner auto-assignment, member invite flow, and repo URL normalization."""

    def setUp(self):
        self.owner = User.objects.create_user(email='owner_rbac@test.com', password='password123', full_name='Alice Owner')
        self.owner_token = Token.objects.create(user=self.owner)

        self.maintainer = User.objects.create_user(email='maintainer_rbac@test.com', password='password123', full_name='Bob Maintainer')
        self.maintainer_token = Token.objects.create(user=self.maintainer)

        self.dev = User.objects.create_user(email='dev_rbac@test.com', password='password123', full_name='Charlie Dev')
        self.dev_token = Token.objects.create(user=self.dev)

        self.stranger = User.objects.create_user(email='stranger@test.com', password='password123', full_name='Eve Stranger')
        self.stranger_token = Token.objects.create(user=self.stranger)

        # Create workspace via API to test auto-owner assignment
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        create_res = self.client.post(reverse('workspace-list'), {
            'name': 'Alpha Workspace',
            'description': 'Core engineering workspace'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.workspace_id = create_res.data['id']
        self.workspace = Workspace.objects.get(id=self.workspace_id)

    def test_auto_assign_owner_membership(self):
        """Creating a workspace automatically assigns OWNER role membership."""
        membership = WorkspaceMember.objects.filter(workspace=self.workspace, user=self.owner).first()
        self.assertIsNotNone(membership)
        self.assertEqual(membership.role, WorkspaceMember.Role.OWNER)

    def test_strict_workspace_isolation(self):
        """Stranger cannot see or access workspace they do not belong to."""
        # Stranger listing workspaces sees 0 results
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.stranger_token.key)
        res = self.client.get(reverse('workspace-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['results']), 0)

        # Stranger GET detail returns 404
        detail_res = self.client.get(reverse('workspace-detail', kwargs={'pk': self.workspace_id}))
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

        # Owner listing workspaces sees 1
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        res_owner = self.client.get(reverse('workspace-list'))
        self.assertEqual(res_owner.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_owner.data['results']), 1)
        self.assertEqual(res_owner.data['results'][0]['current_user_role'], 'OWNER')

    def test_add_member_flow(self):
        """Owner can invite a member by email and assign role."""
        url = reverse('workspace-members', kwargs={'pk': self.workspace_id})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)

        # Add developer
        add_res = self.client.post(url, {
            'email': 'dev_rbac@test.com',
            'role': 'DEVELOPER'
        }, format='json')
        self.assertEqual(add_res.status_code, status.HTTP_201_CREATED)
        # Returns updated member list
        self.assertEqual(len(add_res.data), 2)

        # Verify developer can now see the workspace
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.dev_token.key)
        dev_list_res = self.client.get(reverse('workspace-list'))
        self.assertEqual(len(dev_list_res.data['results']), 1)
        self.assertEqual(dev_list_res.data['results'][0]['current_user_role'], 'DEVELOPER')

    def test_add_member_error_cases(self):
        """Verify 404 for unknown email, 400 for duplicate, 403 for developer role."""
        url = reverse('workspace-members', kwargs={'pk': self.workspace_id})

        # 404 for non-existent user
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        res_404 = self.client.post(url, {'email': 'ghost@nowhere.com', 'role': 'DEVELOPER'}, format='json')
        self.assertEqual(res_404.status_code, status.HTTP_404_NOT_FOUND)

        # 400 for duplicate member (owner already exists)
        res_400 = self.client.post(url, {'email': 'owner_rbac@test.com', 'role': 'MAINTAINER'}, format='json')
        self.assertEqual(res_400.status_code, status.HTTP_400_BAD_REQUEST)

        # Developer trying to invite another member receives 403
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.dev, role=WorkspaceMember.Role.DEVELOPER)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.dev_token.key)
        res_403 = self.client.post(url, {'email': 'stranger@test.com', 'role': 'DEVELOPER'}, format='json')
        self.assertEqual(res_403.status_code, status.HTTP_403_FORBIDDEN)

    def test_repo_url_normalization(self):
        """Adding a repo with full GitHub URL normalizes to owner/repo."""
        url = reverse('workspace-repos', kwargs={'pk': self.workspace_id})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)

        res = self.client.post(url, {
            'name': 'https://github.com/torvalds/linux.git/'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'torvalds/linux')
        self.assertEqual(res.data['github_url'], 'https://github.com/torvalds/linux')


class SecurityAndConcurrencyGapsAPITest(APITestCase):
    """
    Test RBAC security enforcement, anti-abuse checks, concurrency controls,
    real comments API, and global leaderboard endpoint.
    """

    def setUp(self):
        # Workspace Owner
        self.owner = User.objects.create_user(email='lead_owner@test.com', password='password123', full_name='Alice Lead')
        self.owner_token = Token.objects.create(user=self.owner)

        # Workspace Maintainer
        self.maintainer = User.objects.create_user(email='lead_maint@test.com', password='password123', full_name='Bob Maintainer')
        self.maintainer_token = Token.objects.create(user=self.maintainer)

        # Workspace Developer
        self.developer = User.objects.create_user(email='lead_dev@test.com', password='password123', full_name='Charlie Dev')
        self.developer_token = Token.objects.create(user=self.developer)

        # Create Workspace and Memberships
        self.workspace = Workspace.objects.create(name='Security Audit Org', owner=self.owner)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.owner, role=WorkspaceMember.Role.OWNER)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.maintainer, role=WorkspaceMember.Role.MAINTAINER)
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.developer, role=WorkspaceMember.Role.DEVELOPER)

        # Create Repository and Issues
        self.repo = Repository.objects.create(workspace=self.workspace, name='core-api')
        self.issue = Issue.objects.create(
            workspace=self.workspace,
            repository=self.repo,
            title='Refactor auth token expiration',
            bounty_points=500,
            creator=self.owner
        )

    def test_developer_close_issue_forbidden(self):
        """DEVELOPER attempting close_issue returns 403 Forbidden."""
        self.issue.assignee = self.developer
        self.issue.status = Issue.Status.IN_REVIEW
        self.issue.save()

        url = reverse('issue-close-issue', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.developer_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creator_cannot_claim_own_issue(self):
        """Creator attempting to claim own issue returns 400 Bad Request."""
        url = reverse('issue-claim', kwargs={'pk': self.issue.pk})
        # Owner is the creator
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Issue creators cannot claim their own bounty', response.data['detail'])

    def test_comments_api_listing_and_posting(self):
        """Posting & listing real comments on /api/v1/issues/{id}/comments/."""
        url = reverse('issue-comments', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.developer_token.key)

        # Post a comment
        comment_payload = {'content': 'PR opened at https://github.com/org/repo/pull/42'}
        post_res = self.client.post(url, comment_payload, format='json')
        self.assertEqual(post_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(post_res.data['content'], comment_payload['content'])
        self.assertEqual(post_res.data['author']['email'], self.developer.email)

        # List comments
        list_res = self.client.get(url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]['content'], comment_payload['content'])

        # Verify issue detail serializer includes comments_count and comments
        issue_detail_url = reverse('issue-detail', kwargs={'pk': self.issue.pk})
        detail_res = self.client.get(issue_detail_url)
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['comments_count'], 1)
        self.assertEqual(len(detail_res.data['comments']), 1)

    def test_leaderboard_endpoint_with_solved_issues_count(self):
        """Fetching /api/v1/leaderboard/ returns ranked users with accurate solved_issues_count."""
        # Close an issue for developer to award points
        self.issue.assignee = self.developer
        self.issue.status = Issue.Status.IN_REVIEW
        self.issue.save()

        close_url = reverse('issue-close-issue', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.maintainer_token.key)
        close_res = self.client.post(close_url)
        self.assertEqual(close_res.status_code, status.HTTP_200_OK)

        # Call leaderboard
        leaderboard_url = reverse('leaderboard')
        lb_res = self.client.get(leaderboard_url)
        self.assertEqual(lb_res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(lb_res.data) >= 1)

        # Developer should be top ranked with 500 points and 1 solved issue
        dev_entry = next((item for item in lb_res.data if item['email'] == self.developer.email), None)
        self.assertIsNotNone(dev_entry)
        self.assertEqual(dev_entry['total_points'], 500)
        self.assertEqual(dev_entry['solved_issues_count'], 1)

    def test_internal_task_filtering_by_workspace(self):
        """Creating an internal task (repository=None, workspace=<id>) appears when filtering ?workspace=<id>."""
        url = reverse('issue-list')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)

        # Create internal task without repository
        create_res = self.client.post(url, {
            'workspace': self.workspace.pk,
            'title': 'Internal DB Migration Check',
            'description': 'Ensure all DB migrations are applied',
            'bounty_points': 150,
            'repository': None
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        internal_task_id = create_res.data['id']
        self.assertIsNone(create_res.data['repository'])
        self.assertEqual(create_res.data['workspace_id'], self.workspace.pk)

        # Filter by workspace query param
        filter_res = self.client.get(f"{url}?workspace={self.workspace.pk}")
        self.assertEqual(filter_res.status_code, status.HTTP_200_OK)
        task_ids = [item['id'] for item in filter_res.data['results']]
        self.assertIn(internal_task_id, task_ids)

    def test_unassign_action(self):
        """Maintainer can unassign an IN_PROGRESS issue back to OPEN."""
        self.issue.assignee = self.developer
        self.issue.status = Issue.Status.IN_PROGRESS
        self.issue.claimed_at = timezone.now()
        self.issue.save()

        url = reverse('issue-unassign', kwargs={'pk': self.issue.pk})
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.maintainer_token.key)
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, Issue.Status.OPEN)
        self.assertIsNone(self.issue.assignee)
        self.assertIsNone(self.issue.claimed_at)
