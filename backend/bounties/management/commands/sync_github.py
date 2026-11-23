"""
Management command to synchronize GitHub repositories and issues for a workspace.

Usage:
    python manage.py sync_github --workspace=<slug_or_id> --repo=<owner/name> [--token=<gh_token>]
"""

from django.core.management.base import BaseCommand, CommandError
from bounties.models import Workspace
from bounties.services import GitHubSyncService


class Command(BaseCommand):
    help = 'Sync GitHub repository and open issues into a GitPulse workspace.'

    def add_arguments(self, parser):
        parser.add_argument('--workspace', required=True, help='Workspace ID or slug')
        parser.add_argument('--repo', required=True, help='GitHub repository name e.g. "owner/repo" or "repo"')
        parser.add_argument('--token', default=None, help='Optional GitHub Personal Access Token (PAT)')

    def handle(self, *args, **options):
        ws_identifier = options['workspace']
        repo_arg = options['repo']
        token = options['token']

        # Find workspace
        try:
            if ws_identifier.isdigit():
                workspace = Workspace.objects.get(pk=int(ws_identifier))
            else:
                workspace = Workspace.objects.get(slug=ws_identifier)
        except Workspace.DoesNotExist:
            raise CommandError(f"Workspace '{ws_identifier}' does not exist.")

        self.stdout.write(f"Initiating GitHub sync for workspace '{workspace.name}' on repo '{repo_arg}'...")

        service = GitHubSyncService(token=token)
        try:
            result = service.sync_workspace_repository(
                workspace=workspace,
                repo_name=repo_arg,
                sync_user=workspace.owner
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully synced repository '{result['repository'].name}'. "
                    f"Synced {result['synced_issues_count']} open bounty issues."
                )
            )
        except Exception as e:
            raise CommandError(f"Failed to sync GitHub repository: {str(e)}")
