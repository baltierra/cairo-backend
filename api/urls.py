# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import HealthView

# Keep router even if empty now—easy to plug viewsets later.
router = DefaultRouter()

urlpatterns = [
    # Health check (no auth)
    path("health/", HealthView.as_view(), name="health"),

    # JWT auth
    path(
        "auth/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair"
    ),
    path(
        "auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh"
    ),

    # Viewsets (add as you build them)
    path("", include(router.urls)),
]

# ----- Example: when you add a viewset, register it like this -----
# from .views import NoteViewSet
# router.register(r"notes", NoteViewSet, basename="note")
