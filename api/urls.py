from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    HealthView, places_geojson, place_details, event_details, person_details,
    PhotoViewSet, HistoricPersonViewSet,
    HistoricPlaceViewSet, HistoricEventViewSet,
    PersonPlaceViewSet, EventPersonViewSet,
    EventPhotoViewSet, PlacePhotoViewSet
)

router = DefaultRouter()
router.register(r"photos", PhotoViewSet, basename="photo")
router.register(r"people", HistoricPersonViewSet, basename="person")
router.register(r"places", HistoricPlaceViewSet, basename="place")
router.register(r"events", HistoricEventViewSet, basename="event")
router.register(r"person-places", PersonPlaceViewSet, basename="person-place")
router.register(r"event-people", EventPersonViewSet, basename="event-person")
router.register(r"event-photos", EventPhotoViewSet, basename="event-photo")
router.register(r"place-photos", PlacePhotoViewSet, basename="place-photo")

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),

    # Map data & details
    path("places.geojson", places_geojson, name="places-geojson"),
    path("places/<int:pk>/details/", place_details, name="place-details"),
    path("events/<int:pk>/details/", event_details, name="event-details"),
    path("persons/<int:pk>/details/", person_details, name="person-details"),

    # Auth
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

    path("", include(router.urls)),
]
