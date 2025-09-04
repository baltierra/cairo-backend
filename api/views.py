from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from core.models import (
    Photo,
    HistoricPerson,
    HistoricPlace,
    HistoricEvent,
    PersonPlace,
    EventPerson,
    EventPhoto,
    PlacePhoto,
)
from .serializers import (
    PhotoSerializer,
    HistoricPersonSerializer,
    HistoricPlaceSerializer,
    HistoricEventSerializer,
    PersonPlaceSerializer,
    EventPersonSerializer,
    EventPhotoSerializer,
    PlacePhotoSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})


class BaseReadWrite(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PhotoViewSet(BaseReadWrite):
    queryset = Photo.objects.all()
    serializer_class = PhotoSerializer


class HistoricPersonViewSet(BaseReadWrite):
    queryset = HistoricPerson.objects.select_related("profile_photo").all()
    serializer_class = HistoricPersonSerializer


class HistoricPlaceViewSet(BaseReadWrite):
    queryset = HistoricPlace.objects.all()
    serializer_class = HistoricPlaceSerializer


class HistoricEventViewSet(BaseReadWrite):
    queryset = HistoricEvent.objects.all()
    serializer_class = HistoricEventSerializer


class PersonPlaceViewSet(BaseReadWrite):
    queryset = PersonPlace.objects.select_related("person", "place").all()
    serializer_class = PersonPlaceSerializer


class EventPersonViewSet(BaseReadWrite):
    queryset = EventPerson.objects.select_related("event", "person").all()
    serializer_class = EventPersonSerializer


class EventPhotoViewSet(BaseReadWrite):
    queryset = EventPhoto.objects.select_related("event", "photo").all()
    serializer_class = EventPhotoSerializer


class PlacePhotoViewSet(BaseReadWrite):
    queryset = PlacePhoto.objects.select_related("place", "photo").all()
    serializer_class = PlacePhotoSerializer


def places_geojson(request):
    """Lightweight GeoJSON for map pins (name & brief in tooltip)."""
    features = []
    qs = HistoricPlace.objects.all().only(
        "id", "place_name", "brief", "latitude", "longitude"
    )
    for p in qs:
        features.append({
            "type": "Feature",
            "id": p.id,
            "geometry": {
                "type": "Point",
                "coordinates": [
                    float(p.longitude),
                    float(p.latitude)
                ]},
            "properties": {"name": p.place_name, "brief": p.brief or ""},
        })
    return JsonResponse({"type": "FeatureCollection", "features": features})


def _abs(request, url):
    # Build absolute URL for media (so the static frontend can use it)
    return request.build_absolute_uri(url) if url else None


def place_details(request, pk: int):
    """Rich detail for a place: fields, photos, events, persons."""
    p = get_object_or_404(HistoricPlace, pk=pk)

    photos = [
        {
            "url": _abs(request,
                        pp.photo.image.url) if getattr(
                                                pp.photo,
                                                "image", None
                                            ) else None,
            "caption": pp.photo.caption,
            "order": pp.photo_order,
        }
        for pp in PlacePhoto.objects.select_related("photo").filter(place=p).order_by("photo_order")
        if getattr(pp.photo, "image", None)
    ]

    events = list(
        HistoricEvent.objects.filter(place=p)
        .values("id", "event_name", "event_date")
        .order_by("-event_date")
    )

    persons = list(
        HistoricPerson.objects.filter(personplace__place=p)
        .distinct()
        .values("id", "first_name", "last_name")
        .order_by("last_name", "first_name")
    )

    data = {
        "id": p.id,
        "name": p.place_name,
        "date_start": p.date_start,
        "date_end": p.date_end,
        "brief": p.brief,
        "history": p.history,
        "latitude": float(p.latitude),
        "longitude": float(p.longitude),
        "photos": photos,
        "events": events,
        "persons": persons,
    }
    return JsonResponse(data)


def event_details(request, pk: int):
    e = get_object_or_404(HistoricEvent.objects.select_related("place"), pk=pk)
    photos = [
        {
            "url": _abs(
                    request,
                    ep.photo.image.url
                ) if getattr(ep.photo, "image", None) else None,
            "caption": ep.photo.caption,
            "order": ep.photo_order,
        }
        for ep in EventPhoto.objects.select_related("photo").filter(event=e).order_by("photo_order")
        if getattr(ep.photo, "image", None)
    ]
    people = list(
        HistoricPerson.objects.filter(eventperson__event=e)
        .values("id", "first_name", "last_name")
        .order_by("last_name", "first_name")
    )
    data = {
        "id": e.id,
        "name": e.event_name,
        "date": e.event_date,
        "description": e.event_description,
        "significance": e.significance,
        "place": {"id": e.place_id, "name": e.place.place_name},
        "photos": photos,
        "persons": people,
    }
    return JsonResponse(data)


def person_details(request, pk: int):
    person = get_object_or_404(HistoricPerson, pk=pk)
    profile_photo_url = None
    if getattr(
        person,
        "profile_photo",
        None
    ) and getattr(person.profile_photo, "image", None):
        profile_photo_url = _abs(request, person.profile_photo.image.url)

    events = list(
        HistoricEvent.objects.filter(eventperson__person=person)
        .select_related("place")
        .values("id", "event_name",
                "event_date", "place__id", "place__place_name")
        .order_by("-event_date")
    )
    places = list(
        HistoricPlace.objects.filter(personplace__person=person)
        .values("id", "place_name")
        .order_by("place_name")
    )
    data = {
        "id": person.id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "dob": person.dob,
        "brief": person.brief,
        "biography": person.biography,
        "profile_photo_url": profile_photo_url,
        "events": events,
        "places": places,
    }
    return JsonResponse(data)
