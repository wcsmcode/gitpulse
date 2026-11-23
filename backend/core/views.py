"""
Public presentation Class-Based Views (CBVs) for GitPulse.

Provides:
- HomeView: Public minimalist landing page presenting metrics, value proposition,
  and quick preview of active bounties & leaderboard.
- UserRegistrationView: Member signup with automatic developer profile creation.
- UserLoginView & UserLogoutView: Session authentication.
"""

from django.contrib.auth import login
from django.contrib.auth.views import LoginView, LogoutView
from django.db.models import Sum
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView, CreateView

from bounties.models import Issue, Workspace, Repository
from userauths.models import User, Profile
from .forms import UserRegistrationForm, UserLoginForm


class HomeView(TemplateView):
    """
    Public minimalist landing page presenting GitPulse's core value proposition,
    live workspace statistics, active bounty challenges, and developer leaderboard.
    """
    template_name = 'core/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Open bounties with relationships pre-loaded to prevent N+1 queries
        context['recent_issues'] = (
            Issue.objects.select_related('repository', 'repository__workspace', 'creator')
            .filter(status='OPEN')
            .order_by('-bounty_points', '-created_at')[:6]
        )
        # Top developers leaderboard by verified bounty XP
        context['leaderboard'] = (
            Profile.objects.select_related('user')
            .filter(total_points__gt=0)
            .order_by('-total_points')[:5]
        )
        context['workspaces_count'] = Workspace.objects.count()
        context['repositories_count'] = Repository.objects.count()
        context['open_issues_count'] = Issue.objects.filter(status='OPEN').count()
        context['total_bounty_xp'] = (
            Issue.objects.aggregate(total=Sum('bounty_points'))['total'] or 0
        )
        return context


class UserRegistrationView(CreateView):
    """
    User registration Class-Based View.
    """
    model = User
    form_class = UserRegistrationForm
    template_name = 'core/register.html'
    success_url = reverse_lazy('home')

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('home')
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        user = form.save()
        login(self.request, user)
        return redirect(self.success_url)


class UserLoginView(LoginView):
    """
    User login Class-Based View with styled Tailwind form.
    """
    form_class = UserLoginForm
    template_name = 'core/login.html'
    redirect_authenticated_user = True

    def get_success_url(self):
        return reverse_lazy('home')


class UserLogoutView(LogoutView):
    """
    User logout view.
    """
    next_page = reverse_lazy('home')
