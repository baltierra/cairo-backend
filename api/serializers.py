from rest_framework import serializers
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


# Base serializers
class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = "__all__"


class HistoricPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricPerson
        fields = "__all__"


class HistoricPlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricPlace
        fields = "__all__"


class HistoricEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricEvent
        fields = "__all__"


# Junction serializers
class PersonPlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonPlace
        fields = "__all__"


class EventPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPerson
        fields = "__all__"


class EventPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPhoto
        fields = "__all__"


class PlacePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacePhoto
        fields = "__all__"
