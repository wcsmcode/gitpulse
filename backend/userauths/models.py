"""
User authentication and profile models for GitPulse (DevBounty).

This module defines the custom User model (email-based authentication)
and the Developer Profile model used for bounty score and XP tracking.
"""

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserManager(BaseUserManager):
    """Custom manager for User model where email is the unique identifier for auth."""
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        if not email:
            raise ValueError('Email là bắt buộc.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model for GitPulse authentication.
    
    Uses email as the unique identifier instead of username.
    """
    username = None
    email = models.EmailField(unique=True, verbose_name='Email Address')
    full_name = models.CharField(max_length=150, blank=True, verbose_name='Full Name')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['email']

    def __str__(self):
        return self.email


class Profile(models.Model):
    """
    Developer profile model for gamification & GitHub integration.

    Tracks accumulated bounty points (XP), external GitHub username,
    and profile bio for developers participating in bounties.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='User'
    )
    github_username = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='GitHub Username'
    )
    avatar_url = models.URLField(
        blank=True,
        verbose_name='Avatar URL'
    )
    bio = models.TextField(
        blank=True,
        verbose_name='Bio'
    )
    total_points = models.PositiveIntegerField(
        default=0,
        verbose_name='Total Bounty Points (XP)'
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
        verbose_name = 'Profile'
        verbose_name_plural = 'Profiles'
        ordering = ['-total_points', 'user__email']

    def __str__(self):
        return f"{self.user.email} Profile ({self.total_points} XP)"


@receiver(post_save, sender=User)
def create_or_save_user_profile(sender, instance, created, **kwargs):
    """
    Signal receiver to create or update a Profile whenever a User is saved.
    """
    if created:
        Profile.objects.create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
