"""
Database models for GitPulse (DevBounty) issue tracking and gamification.

Includes:
- Workspace: Organization or team space.
- WorkspaceMember: RBAC role memberships (Owner, Maintainer, Developer).
- Repository: Connected GitHub repositories.
- Issue: Bounty issues with state machine (OPEN -> IN_PROGRESS -> IN_REVIEW -> CLOSED).
- BountyTransaction: Gamification audit ledger for awarded points/XP.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


class Workspace(models.Model):
    """
    Workspace model representing an organization or project team.

    Workspaces group repositories, issues, and team members with RBAC roles.
    """
    name = models.CharField(
        max_length=120,
        unique=True,
        verbose_name='Workspace Name'
    )
    slug = models.SlugField(
        max_length=140,
        unique=True,
        blank=True,
        verbose_name='Workspace Slug'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    github_org = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='GitHub Organization'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_workspaces',
        verbose_name='Workspace Owner'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Workspace'
        verbose_name_plural = 'Workspaces'
        ordering = ['name']

    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided."""
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    """
    Role-Based Access Control (RBAC) membership model for workspaces.

    Supported roles:
    - OWNER: Full control over workspace, repos, and memberships.
    - MAINTAINER: Can create bounties, review PRs, and close issues.
    - DEVELOPER: Can view and claim bounties.
    """
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        MAINTAINER = 'MAINTAINER', 'Maintainer'
        DEVELOPER = 'DEVELOPER', 'Developer'

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='Workspace'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_memberships',
        verbose_name='User'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.DEVELOPER,
        verbose_name='Workspace Role'
    )
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Joined At'
    )

    class Meta:
        verbose_name = 'Workspace Member'
        verbose_name_plural = 'Workspace Members'
        unique_together = ('workspace', 'user')
        ordering = ['workspace', 'role', 'joined_at']

    def __str__(self):
        return f"{self.user.email} - {self.workspace.name} ({self.get_role_display()})"


class Repository(models.Model):
    """
    Repository model representing a GitHub repository synced to a workspace.
    """
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='repositories',
        verbose_name='Workspace'
    )
    name = models.CharField(
        max_length=150,
        verbose_name='Repository Name'
    )
    github_repo_id = models.PositiveBigIntegerField(
        unique=True,
        null=True,
        blank=True,
        verbose_name='GitHub Repository ID'
    )
    github_url = models.URLField(
        blank=True,
        verbose_name='GitHub URL'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Is Active'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Repository'
        verbose_name_plural = 'Repositories'
        unique_together = ('workspace', 'name')
        ordering = ['workspace', 'name']

    def __str__(self):
        return f"{self.workspace.name}/{self.name}"


class Issue(models.Model):
    """
    Bounty Issue model tracking development tasks with bounty XP rewards.

    Implements the state machine:
    OPEN -> IN_PROGRESS (Claimed) -> IN_REVIEW -> CLOSED.
    """
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        IN_REVIEW = 'IN_REVIEW', 'In Review'
        CLOSED = 'CLOSED', 'Closed'

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='issues',
        verbose_name='Workspace'
    )
    repository = models.ForeignKey(
        Repository,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issues',
        verbose_name='Repository'
    )
    title = models.CharField(
        max_length=255,
        verbose_name='Title'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    github_issue_number = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='GitHub Issue Number'
    )
    bounty_points = models.PositiveIntegerField(
        default=100,
        verbose_name='Bounty Points (XP)'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
        verbose_name='Status'
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_issues',
        verbose_name='Creator'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_issues',
        verbose_name='Assignee'
    )
    claimed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Claimed At'
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Closed At'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Issue'
        verbose_name_plural = 'Issues'
        ordering = ['-bounty_points', '-created_at']

    def clean(self):
        """Validate state machine constraints."""
        if self.status in [self.Status.IN_PROGRESS, self.Status.IN_REVIEW] and not self.assignee:
            raise ValidationError("An issue in progress or in review must have an assignee.")

    def save(self, *args, **kwargs):
        """Auto-link workspace from repository if not explicitly set."""
        if self.repository and not self.workspace:
            self.workspace = self.repository.workspace
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.id} {self.title} ({self.bounty_points} XP) - [{self.status}]"


class IssueComment(models.Model):
    """
    Comment on an issue, supporting developer discussions and pull request references.
    """
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Issue'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issue_comments',
        verbose_name='Author'
    )
    content = models.TextField(
        verbose_name='Content'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Issue Comment'
        verbose_name_plural = 'Issue Comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.email} on #{self.issue_id}"


class BountyTransaction(models.Model):
    """
    Gamification audit ledger recording bounty points transferred to developers upon issue closure.
    """
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='bounty_transactions',
        verbose_name='Issue'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bounty_transactions',
        verbose_name='Recipient'
    )
    points = models.PositiveIntegerField(
        verbose_name='Points Awarded'
    )
    awarded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Awarded At'
    )

    class Meta:
        verbose_name = 'Bounty Transaction'
        verbose_name_plural = 'Bounty Transactions'
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.recipient.email} +{self.points} XP for #{self.issue_id}"

