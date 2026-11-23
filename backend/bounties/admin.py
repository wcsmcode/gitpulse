"""
Django Admin configurations for GitPulse (DevBounty) models.
"""

from django.contrib import admin
from .models import Workspace, WorkspaceMember, Repository, Issue, IssueComment, BountyTransaction


class WorkspaceMemberInline(admin.TabularInline):
    """Inline view for workspace members."""
    model = WorkspaceMember
    extra = 1


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    """Admin configuration for Workspaces."""
    list_display = ('name', 'slug', 'owner', 'github_org', 'created_at')
    search_fields = ('name', 'github_org', 'owner__email')
    prepopulated_fields = {'slug': ('name',)}
    inlines = (WorkspaceMemberInline,)


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    """Admin configuration for Workspace Memberships (RBAC)."""
    list_display = ('workspace', 'user', 'role', 'joined_at')
    list_filter = ('role', 'workspace')
    search_fields = ('workspace__name', 'user__email')


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    """Admin configuration for Repositories."""
    list_display = ('name', 'workspace', 'github_repo_id', 'is_active', 'created_at')
    list_filter = ('is_active', 'workspace')
    search_fields = ('name', 'workspace__name')


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    """Admin configuration for Bounty Issues."""
    list_display = ('id', 'title', 'workspace', 'repository', 'bounty_points', 'status', 'assignee', 'created_at')
    list_filter = ('status', 'workspace', 'repository')
    search_fields = ('title', 'description', 'assignee__email', 'creator__email')
    ordering = ('-bounty_points', '-created_at')


@admin.register(IssueComment)
class IssueCommentAdmin(admin.ModelAdmin):
    """Admin configuration for Issue Comments."""
    list_display = ('id', 'issue', 'author', 'created_at')
    search_fields = ('content', 'author__email', 'issue__title')
    list_filter = ('created_at',)


@admin.register(BountyTransaction)
class BountyTransactionAdmin(admin.ModelAdmin):
    """Admin configuration for Bounty Transactions."""
    list_display = ('id', 'recipient', 'points', 'issue', 'awarded_at')
    search_fields = ('recipient__email', 'issue__title')
    list_filter = ('awarded_at',)

