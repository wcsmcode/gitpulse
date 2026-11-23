from .services import GitHubSyncService
"""
Pagination and DRF ViewSets for GitPulse (DevBounty) - Phase 2.

Features:
- WorkspaceViewSet: Manage workspaces, members, and connected repos.
- RepositoryViewSet: Manage repositories under workspaces.
- IssueViewSet: Issue lifecycle actions (claim, submit_review, close_issue) with atomic XP transfer.
- BountyTransactionViewSet: Gamification points ledger.
"""

from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import viewsets, status, permissions, exceptions
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from userauths.models import User, Profile
from .models import Workspace, WorkspaceMember, Repository, Issue, IssueComment, BountyTransaction
from .permissions import (
    IsWorkspaceOwnerOrReadOnly,
    IsWorkspaceMaintainerOrReadOnly,
    IsIssueAssigneeOrCreator
)
from .serializers import (
    WorkspaceSerializer,
    WorkspaceMemberSerializer,
    RepositorySerializer,
    IssueSerializer,
    IssueCommentSerializer,
    LeaderboardUserSerializer,
    BountyTransactionSerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    """Configurable pagination class for API collections."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workspaces with member management.

    Endpoints:
    - GET /api/v1/workspaces/
    - POST /api/v1/workspaces/
    - GET /api/v1/workspaces/{id}/
    - GET /api/v1/workspaces/{id}/members/
    - POST /api/v1/workspaces/{id}/members/
    - GET /api/v1/workspaces/{id}/repos/
    """
    serializer_class = WorkspaceSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly, IsWorkspaceOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Workspace.objects.none()
        return (
            Workspace.objects
            .filter(memberships__user=user)
            .select_related('owner', 'owner__profile')
            .prefetch_related('memberships', 'memberships__user', 'memberships__user__profile', 'repositories')
            .distinct()
        )

    def perform_create(self, serializer):
        """Set creating user as workspace owner and create OWNER membership."""
        workspace = serializer.save(owner=self.request.user)
        WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=self.request.user,
            defaults={'role': WorkspaceMember.Role.OWNER}
        )

    @action(detail=True, methods=['get', 'post'], url_path='members', permission_classes=[IsAuthenticated])
    def members(self, request, pk=None):
        """Manage members of this workspace."""
        workspace = self.get_object()

        if request.method == 'GET':
            memberships = workspace.memberships.select_related('user', 'user__profile').all()
            serializer = WorkspaceMemberSerializer(memberships, many=True)
            return Response(serializer.data)

        # POST: Add member (must be owner or maintainer)
        is_admin = (
            workspace.owner == request.user or
            WorkspaceMember.objects.filter(
                workspace=workspace,
                user=request.user,
                role__in=[WorkspaceMember.Role.OWNER, WorkspaceMember.Role.MAINTAINER]
            ).exists()
        )
        if not is_admin:
            return Response(
                {'detail': 'Only owners and maintainers can add members.'},
                status=status.HTTP_403_FORBIDDEN
            )

        email = request.data.get('email', '').strip()
        role = request.data.get('role', WorkspaceMember.Role.DEVELOPER).upper()

        if not email:
            return Response({'detail': 'Field "email" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {'detail': f'User with email "{email}" does not exist.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if WorkspaceMember.objects.filter(workspace=workspace, user=target_user).exists():
            return Response(
                {'detail': f'User "{email}" is already a member of this workspace.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_roles = [WorkspaceMember.Role.MAINTAINER, WorkspaceMember.Role.DEVELOPER]
        if role not in valid_roles:
            return Response(
                {'detail': f'Invalid role "{role}". Must be DEVELOPER or MAINTAINER.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        WorkspaceMember.objects.create(workspace=workspace, user=target_user, role=role)

        updated_memberships = workspace.memberships.select_related('user', 'user__profile').all()
        serializer = WorkspaceMemberSerializer(updated_memberships, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticatedOrReadOnly])
    def repos(self, request, pk=None):
        """List or link repositories belonging to this workspace."""
        workspace = self.get_object()

        if request.method == 'GET':
            repos = workspace.repositories.all()
            serializer = RepositorySerializer(repos, many=True)
            return Response(serializer.data)

        # POST: Link a new repository to this workspace
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        is_maintainer = (
            workspace.owner == request.user or
            WorkspaceMember.objects.filter(
                workspace=workspace,
                user=request.user,
                role__in=[WorkspaceMember.Role.OWNER, WorkspaceMember.Role.MAINTAINER]
            ).exists()
        )
        if not is_maintainer:
            return Response({'detail': 'Only owners and maintainers can link repositories.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RepositorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def sync_github(self, request, pk=None):
        """
        Trigger GitHub API sync for a specified repository in this workspace.
        Requires workspace owner or maintainer privileges.
        Payload: { "repo": "owner/repo" or "repo", "token": "optional_token" }
        """
        workspace = self.get_object()

        # Check permissions: owner or maintainer
        is_maintainer = (
            workspace.owner == request.user or
            WorkspaceMember.objects.filter(
                workspace=workspace,
                user=request.user,
                role__in=[WorkspaceMember.Role.OWNER, WorkspaceMember.Role.MAINTAINER]
            ).exists()
        )
        if not is_maintainer:
            return Response(
                {'detail': 'Only workspace owners or maintainers can trigger GitHub synchronization.'},
                status=status.HTTP_403_FORBIDDEN
            )

        repo_name = request.data.get('repo')
        if not repo_name:
            return Response(
                {'detail': 'Field "repo" is required (e.g. "facebook/react" or "my-repo").'},
                status=status.HTTP_400_BAD_REQUEST
            )

        token = request.data.get('token')
        service = GitHubSyncService(token=token)

        try:
            result = service.sync_workspace_repository(
                workspace=workspace,
                repo_name=repo_name,
                sync_user=request.user
            )
            return Response({
                'detail': f'Successfully synced repository {result["repository"].name}.',
                'synced_issues_count': result['synced_issues_count'],
                'repository_id': result['repository'].id,
                'github_url': result['github_url']
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'GitHub sync failed: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )



def get_issue_workspace(issue):
    """Resolve the workspace associated with an issue."""
    if issue.workspace:
        return issue.workspace
    if issue.repository and issue.repository.workspace:
        return issue.repository.workspace
    return None


def is_workspace_maintainer_or_owner(workspace, user):
    """Check if user has OWNER or MAINTAINER privilege in workspace."""
    if not workspace or not user or not user.is_authenticated:
        return False
    if user.is_superuser or workspace.owner == user:
        return True
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        user=user,
        role__in=[WorkspaceMember.Role.OWNER, WorkspaceMember.Role.MAINTAINER]
    ).exists()


def is_workspace_member(workspace, user):
    """Check if user is a member of the workspace with any role."""
    if not workspace or not user or not user.is_authenticated:
        return False
    if user.is_superuser or workspace.owner == user:
        return True
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        user=user
    ).exists()


class RepositoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Repositories synced within a workspace.
    Enforces strict workspace isolation.
    """
    serializer_class = RepositorySerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly, IsWorkspaceMaintainerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Repository.objects.none()

        queryset = (
            Repository.objects
            .filter(Q(workspace__memberships__user=user) | Q(workspace__owner=user))
            .select_related('workspace')
            .distinct()
        )
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset


class IssueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Bounty Issues with state transitions & gamification actions.

    Actions:
    - POST /api/v1/issues/{id}/claim/
    - POST /api/v1/issues/{id}/submit_review/
    - POST /api/v1/issues/{id}/close_issue/
    - POST /api/v1/issues/{id}/unassign/
    - GET, POST /api/v1/issues/{id}/comments/
    """
    serializer_class = IssueSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly, IsIssueAssigneeOrCreator]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Issue.objects.none()

        queryset = (
            Issue.objects
            .filter(
                Q(workspace__memberships__user=user) |
                Q(workspace__owner=user) |
                Q(repository__workspace__memberships__user=user) |
                Q(repository__workspace__owner=user)
            )
            .select_related(
                'workspace',
                'repository',
                'repository__workspace',
                'creator',
                'creator__profile',
                'assignee',
                'assignee__profile'
            )
            .prefetch_related('comments', 'comments__author', 'comments__author__profile')
            .distinct()
        )
        status_param = self.request.query_params.get('status')
        workspace_id = self.request.query_params.get('workspace')
        repo_id = self.request.query_params.get('repository')

        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if workspace_id:
            queryset = queryset.filter(
                Q(workspace_id=workspace_id) |
                Q(repository__workspace_id=workspace_id)
            )
        if repo_id:
            queryset = queryset.filter(repository_id=repo_id)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        workspace = serializer.validated_data.get('workspace')
        repository = serializer.validated_data.get('repository')
        if not workspace and repository:
            workspace = repository.workspace

        if not workspace:
            raise exceptions.ValidationError({'workspace': 'Workspace or Repository linked to a workspace is required.'})

        if not is_workspace_maintainer_or_owner(workspace, user):
            raise exceptions.PermissionDenied('Only workspace owners and maintainers can create issues.')

        serializer.save(creator=user, workspace=workspace)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def claim(self, request, pk=None):
        """
        Claim an open bounty issue.
        Transitions state from OPEN -> IN_PROGRESS.
        """
        issue = self.get_object()
        workspace = get_issue_workspace(issue)

        if not is_workspace_member(workspace, request.user):
            return Response(
                {'detail': 'Only workspace members can claim bounties.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if issue.creator == request.user:
            return Response(
                {'detail': 'Issue creators cannot claim their own bounty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if issue.status != Issue.Status.OPEN:
            return Response(
                {'detail': f'Cannot claim an issue with status: {issue.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        issue.assignee = request.user
        issue.status = Issue.Status.IN_PROGRESS
        issue.claimed_at = timezone.now()
        issue.save()

        return Response(IssueSerializer(issue, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_review(self, request, pk=None):
        """
        Submit a claimed bounty for maintainer review.
        Transitions state from IN_PROGRESS -> IN_REVIEW.
        """
        issue = self.get_object()

        if issue.status != Issue.Status.IN_PROGRESS:
            return Response(
                {'detail': 'Issue must be in progress to submit for review.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if issue.assignee != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'Only the assigned developer can submit this bounty for review.'},
                status=status.HTTP_403_FORBIDDEN
            )

        issue.status = Issue.Status.IN_REVIEW
        issue.save()

        return Response(IssueSerializer(issue, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def close_issue(self, request, pk=None):
        """
        Approve and close a bounty issue with ATOMIC XP transfer and row-level locking.
        Transitions state to CLOSED, increments developer profile points,
        and logs a BountyTransaction.
        """
        issue = self.get_object()
        workspace = get_issue_workspace(issue)

        if not is_workspace_maintainer_or_owner(workspace, request.user):
            return Response(
                {'detail': 'Only workspace owners or maintainers can approve and close bounties.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if issue.assignee == request.user:
            return Response(
                {'detail': 'You cannot approve and award XP to your own submission.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not issue.assignee:
            return Response(
                {'detail': 'Cannot close an unassigned bounty issue.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            locked_issue = Issue.objects.select_for_update().get(pk=issue.pk)
            if locked_issue.status == Issue.Status.CLOSED:
                return Response(
                    {'detail': 'Issue is already closed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            locked_issue.status = Issue.Status.CLOSED
            locked_issue.closed_at = timezone.now()
            locked_issue.save()

            profile, _ = Profile.objects.select_for_update().get_or_create(user=locked_issue.assignee)
            profile.total_points += locked_issue.bounty_points
            profile.save()

            BountyTransaction.objects.create(
                issue=locked_issue,
                recipient=locked_issue.assignee,
                points=locked_issue.bounty_points
            )

        return Response({
            'detail': f'Bounty approved! {locked_issue.bounty_points} XP awarded to {locked_issue.assignee.email}.',
            'issue': IssueSerializer(locked_issue, context={'request': request}).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unassign(self, request, pk=None):
        """
        Reset an IN_PROGRESS issue back to OPEN.
        Only workspace owners and maintainers can unassign issues.
        """
        issue = self.get_object()
        workspace = get_issue_workspace(issue)

        if not is_workspace_maintainer_or_owner(workspace, request.user):
            return Response(
                {'detail': 'Only workspace owners or maintainers can unassign issues.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if issue.status != Issue.Status.IN_PROGRESS:
            return Response(
                {'detail': f'Cannot unassign an issue with status: {issue.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        issue.status = Issue.Status.OPEN
        issue.assignee = None
        issue.claimed_at = None
        issue.save()

        return Response(IssueSerializer(issue, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'], url_path='comments', permission_classes=[IsAuthenticated])
    def comments(self, request, pk=None):
        """
        List or create comments on an issue.
        Only workspace members can view or add comments.
        """
        issue = self.get_object()
        workspace = get_issue_workspace(issue)

        if not is_workspace_member(workspace, request.user):
            return Response(
                {'detail': 'Only workspace members can view or add comments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'GET':
            comments = issue.comments.select_related('author', 'author__profile').all()
            serializer = IssueCommentSerializer(comments, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'POST':
            content = request.data.get('content', '').strip()
            if not content:
                return Response(
                    {'content': ['Content cannot be blank.']},
                    status=status.HTTP_400_BAD_REQUEST
                )

            comment = IssueComment.objects.create(
                issue=issue,
                author=request.user,
                content=content
            )
            serializer = IssueCommentSerializer(comment, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class LeaderboardAPIView(APIView):
    """
    Read-only view for the global developer leaderboard.
    Returns developers ordered by total bounty points (XP) descending.
    Annotates solved_issues_count without N+1 queries.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        profiles = (
            Profile.objects
            .select_related('user')
            .annotate(
                solved_issues_count=Count(
                    'user__assigned_issues',
                    filter=Q(user__assigned_issues__status=Issue.Status.CLOSED)
                )
            )
            .order_by('-total_points', '-solved_issues_count')
        )
        serializer = LeaderboardUserSerializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BountyTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet listing gamification bounty transactions.
    """
    serializer_class = BountyTransactionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return (
            BountyTransaction.objects
            .select_related('issue', 'recipient', 'recipient__profile')
            .all()
        )
