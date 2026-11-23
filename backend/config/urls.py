"""
URL configuration for config project.

Routes:
- Admin site (/admin/)
- Auth REST API (/api/v1/auth/)
- DRF REST API (/api/v1/)
- OpenAPI Schema (/api/schema/)
- Swagger UI (/api/docs/)
- Web presentation & Auth (/)
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('userauths.urls')),
    path('api/v1/', include('bounties.urls')),
    # OpenAPI 3.0 Schema & Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('', include('core.urls')),
]
