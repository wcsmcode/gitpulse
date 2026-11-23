"""
Core application URLs: Home, Auth, and Web UI.
"""

from django.urls import path
from .views import HomeView, UserRegistrationView, UserLoginView, UserLogoutView

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
]
