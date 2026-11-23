"""
Custom Role-Based Access Control (RBAC) permissions for GitPulse.

Provides:
- IsWorkspaceOwnerOrReadOnly: Only workspace owner can update/delete workspace.
- IsWorkspaceMaintainerOrReadOnly: Only maintainers or owners can create repositories or close issues.
- IsIssueAssigneeOrCreator: Only assigned developer or creator can update issue details.
"""

from rest_framework import permissions
from .models import Workspace, WorkspaceMember


class IsWorkspaceOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission allowing only owners of a workspace to edit or delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Safe methods (GET, HEAD, OPTIONS) allowed for anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if obj is Workspace or has workspace relation
        workspace = obj if isinstance(obj, Workspace) else getattr(obj, 'workspace', None)
        if not workspace:
            return False

        return workspace.owner == request.user


class IsWorkspaceMaintainerOrReadOnly(permissions.BasePermission):
    """
    Permission allowing workspace OWNERS and MAINTAINERS to perform privileged actions
    such as closing issues, approving bounties, or configuring repos.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False

        # If user is superuser, always allow
        if request.user.is_superuser:
            return True

        # Find the parent workspace
        workspace = None
        if isinstance(obj, Workspace):
            workspace = obj
        elif hasattr(obj, 'repository') and hasattr(obj.repository, 'workspace'):
            workspace = obj.repository.workspace
        elif hasattr(obj, 'workspace'):
            workspace = obj.workspace

        if not workspace:
            return False

        if workspace.owner == request.user:
            return True

        # Check membership role
        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role__in=[WorkspaceMember.Role.OWNER, WorkspaceMember.Role.MAINTAINER]
        ).exists()


class IsIssueAssigneeOrCreator(permissions.BasePermission):
    """
    Allows only the creator or the assigned developer of an issue to modify it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False

        return obj.creator == request.user or obj.assignee == request.user
