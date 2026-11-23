"""
Django Admin registration for userauths models.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, Profile


class ProfileInline(admin.StackedInline):
    """Inline representation of Developer Profile within User admin."""
    model = Profile
    can_delete = False
    verbose_name_plural = 'Developer Profile'
    fk_name = 'user'


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """Admin configuration for custom User model."""
    ordering = ('email',)
    list_display = ('email', 'full_name', 'get_points', 'is_staff', 'is_active')
    search_fields = ('email', 'full_name')
    inlines = (ProfileInline,)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )

    @admin.display(description='XP Points')
    def get_points(self, obj):
        """Display XP points from related profile."""
        return getattr(obj.profile, 'total_points', 0) if hasattr(obj, 'profile') else 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Admin configuration for Profile model."""
    list_display = ('user', 'github_username', 'total_points', 'created_at')
    search_fields = ('user__email', 'github_username')
    list_filter = ('created_at',)
    ordering = ('-total_points',)
