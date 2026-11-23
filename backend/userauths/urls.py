"""
Authentication API URL routes.
"""

from django.urls import path
from .views import RegisterAPIView, LoginAPIView, LogoutAPIView, CurrentUserAPIView

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='auth-register'),
    path('login/', LoginAPIView.as_view(), name='auth-login'),
    path('logout/', LogoutAPIView.as_view(), name='auth-logout'),
    path('me/', CurrentUserAPIView.as_view(), name='auth-me'),
]
