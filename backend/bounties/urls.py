"""
URL routing for bounties REST API using DRF DefaultRouter.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    WorkspaceViewSet,
    RepositoryViewSet,
    IssueViewSet,
    BountyTransactionViewSet,
    LeaderboardAPIView
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'repositories', RepositoryViewSet, basename='repository')
router.register(r'issues', IssueViewSet, basename='issue')
router.register(r'transactions', BountyTransactionViewSet, basename='transaction')

urlpatterns = [
    path('leaderboard/', LeaderboardAPIView.as_view(), name='leaderboard'),
] + router.urls
