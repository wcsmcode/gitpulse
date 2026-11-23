"""
Serializers for GitPulse (DevBounty) REST API.

Provides serialization and validation for:
- UserProfile & User
- Workspace & WorkspaceMember
- Repository
- Issue (with optional repository, claim & close state validation)
- BountyTransaction
"""

from rest_framework import serializers
from userauths.models import User, Profile
from .models import Workspace, WorkspaceMember, Repository, Issue, IssueComment, BountyTransaction


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile gamification info."""
    class Meta:
        model = Profile
        fields = ['github_username', 'avatar_url', 'bio', 'total_points']
        read_only_fields = ['total_points']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Compact user representation for nested serialization."""
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'profile']


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    """Serializer for workspace membership and role."""
    user = UserMinimalSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=False
    )
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    avatar_url = serializers.CharField(source='user.profile.avatar_url', read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            'id', 'workspace', 'user', 'user_id', 'email',
            'full_name', 'avatar_url', 'role', 'joined_at'
        ]
        read_only_fields = ['joined_at', 'workspace']


class RepositorySerializer(serializers.ModelSerializer):
    """Serializer for Repository supporting multi-repo listing & creation."""
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    issues_count = serializers.IntegerField(source='issues.count', read_only=True)

    class Meta:
        model = Repository
        fields = [
            'id', 'workspace', 'workspace_name', 'name',
            'github_repo_id', 'github_url', 'is_active', 'issues_count', 'created_at'
        ]
        read_only_fields = ['created_at', 'workspace']

    def validate_name(self, value):
        """Normalize repository input by stripping URL prefixes, .git and slashes."""
        name = value.strip().strip('/')
        for prefix in ['https://github.com/', 'http://github.com/', 'git@github.com:', 'github.com/']:
            if name.startswith(prefix):
                name = name[len(prefix):]
                break
        name = name.strip('/')
        if name.endswith('.git'):
            name = name[:-4]
        cleaned = name.strip('/')
        if not cleaned:
            raise serializers.ValidationError('Invalid repository name.')
        return cleaned

    def create(self, validated_data):
        """Auto-populate github_url if missing."""
        if not validated_data.get('github_url'):
            validated_data['github_url'] = f"https://github.com/{validated_data['name']}"
        return super().create(validated_data)


class WorkspaceSerializer(serializers.ModelSerializer):
    """Serializer for Workspace with member count, repositories list, and owner info."""
    owner = UserMinimalSerializer(read_only=True)
    members_count = serializers.IntegerField(source='memberships.count', read_only=True)
    repositories_count = serializers.IntegerField(source='repositories.count', read_only=True)
    repositories = RepositorySerializer(many=True, read_only=True)
    members = WorkspaceMemberSerializer(source='memberships', many=True, read_only=True)
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'slug', 'description', 'github_org',
            'owner', 'members_count', 'repositories_count', 'repositories',
            'members', 'current_user_role',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at', 'owner']

    from drf_spectacular.utils import extend_schema_field
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None


class IssueCommentSerializer(serializers.ModelSerializer):
    """
    Serializer for Issue Comments with nested author details.
    """
    author = UserMinimalSerializer(read_only=True)

    class Meta:
        model = IssueComment
        fields = ['id', 'issue', 'author', 'content', 'created_at']
        read_only_fields = ['id', 'issue', 'author', 'created_at']


class IssueSerializer(serializers.ModelSerializer):
    """
    Serializer for Bounty Issue supporting workspace and optional repository linking.
    """
    creator = UserMinimalSerializer(read_only=True)
    assignee = UserMinimalSerializer(read_only=True)
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(),
        required=False,
        allow_null=True
    )
    repository = serializers.PrimaryKeyRelatedField(
        queryset=Repository.objects.all(),
        required=False,
        allow_null=True
    )
    repository_details = RepositorySerializer(source='repository', read_only=True)
    repository_name = serializers.SerializerMethodField()
    workspace_id = serializers.SerializerMethodField()
    workspace_name = serializers.SerializerMethodField()
    comments = IssueCommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'workspace', 'workspace_id', 'workspace_name',
            'repository', 'repository_name', 'repository_details',
            'title', 'description', 'github_issue_number', 'bounty_points',
            'status', 'creator', 'assignee', 'claimed_at', 'closed_at',
            'comments_count', 'comments',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'creator', 'claimed_at', 'closed_at', 'created_at', 'updated_at'
        ]

    from drf_spectacular.utils import extend_schema_field

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_repository_name(self, obj):
        return obj.repository.name if obj.repository else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_workspace_id(self, obj):
        if obj.workspace_id:
            return obj.workspace_id
        if obj.repository and obj.repository.workspace_id:
            return obj.repository.workspace_id
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_workspace_name(self, obj):
        if obj.workspace:
            return obj.workspace.name
        if obj.repository and obj.repository.workspace:
            return obj.repository.workspace.name
        return None

    @extend_schema_field(serializers.IntegerField())
    def get_comments_count(self, obj):
        if hasattr(obj, 'comments_count'):
            return obj.comments_count
        return obj.comments.count()

    def validate_bounty_points(self, value):
        """Ensure bounty points are positive and within reasonable limits."""
        if value <= 0:
            raise serializers.ValidationError("Bounty points must be greater than 0.")
        return value


class LeaderboardUserSerializer(serializers.Serializer):
    """
    Serializer for developer leaderboard ranking.
    """
    id = serializers.IntegerField(source='user.id')
    email = serializers.EmailField(source='user.email')
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    avatar_url = serializers.CharField(allow_blank=True, allow_null=True)
    bio = serializers.CharField(allow_blank=True, allow_null=True)
    total_points = serializers.IntegerField()
    solved_issues_count = serializers.IntegerField(default=0)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('full_name'):
            data['full_name'] = instance.user.get_full_name() or instance.user.email.split('@')[0]
        return data


class BountyTransactionSerializer(serializers.ModelSerializer):
    """Serializer for Bounty reward transactions."""
    recipient = UserMinimalSerializer(read_only=True)
    issue_title = serializers.CharField(source='issue.title', read_only=True)

    class Meta:
        model = BountyTransaction
        fields = ['id', 'issue', 'issue_title', 'recipient', 'points', 'awarded_at']
        read_only_fields = ['awarded_at']
