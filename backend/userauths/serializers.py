"""
Serializers for User authentication and developer profile API.
"""

from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from .models import User, Profile


class ProfileSerializer(serializers.ModelSerializer):
    """Developer profile representation for XP and external links."""
    class Meta:
        model = Profile
        fields = ['github_username', 'avatar_url', 'bio', 'total_points', 'created_at']
        read_only_fields = ['total_points', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Detailed user representation including nested developer profile."""
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'profile', 'is_staff', 'date_joined']
        read_only_fields = ['id', 'is_staff', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration with automatic token creation."""
    password = serializers.CharField(write_only=True, min_length=8)
    token = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'token', 'user']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', '')
        )
        token, _ = Token.objects.get_or_create(user=user)
        return {
            'email': user.email,
            'full_name': user.full_name,
            'token': token.key,
            'user': user
        }


class LoginSerializer(serializers.Serializer):
    """Serializer for user login and token generation."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    token = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
        else:
            raise serializers.ValidationError('Both email and password are required.')

        token, _ = Token.objects.get_or_create(user=user)
        attrs['user'] = user
        attrs['token'] = token.key
        return attrs
