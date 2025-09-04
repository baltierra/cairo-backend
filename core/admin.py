from django.contrib import admin
from .models import (
    Photo,
    HistoricPerson,
    HistoricPlace,
    HistoricEvent,
    PersonPlace,
    EventPerson,
    PlacePhoto,
    EventPhoto,
)


class PlacePhotoInline(admin.TabularInline):
    model = PlacePhoto
    extra = 1
    max_num = 10
    autocomplete_fields = ("photo",)


class EventPhotoInline(admin.TabularInline):
    model = EventPhoto
    extra = 1
    max_num = 10
    autocomplete_fields = ("photo",)


class EventPersonInline(admin.TabularInline):
    model = EventPerson
    extra = 1
    autocomplete_fields = ("event",)


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    fields = ("image",
              "caption",
              "file_name",
              "file_type",
              "file_size",
              "upload_date")
    readonly_fields = ("file_name", "file_type", "file_size", "upload_date")
    list_display = ("id", "file_name", "file_type", "file_size", "upload_date")
    search_fields = ("file_name", "file_path")
    list_filter = ("file_type",)


@admin.register(HistoricPlace)
class HistoricPlaceAdmin(admin.ModelAdmin):
    list_display = ("id",
                    "place_name",
                    "latitude",
                    "longitude",
                    "date_modified")
    search_fields = ("place_name", "brief")
    list_filter = ("date_start", "date_end")
    inlines = [PlacePhotoInline]  # attach up to 10 photos


@admin.register(HistoricEvent)
class HistoricEventAdmin(admin.ModelAdmin):
    list_display = ("id", "event_name", "event_date", "place", "significance")
    search_fields = ("event_name", "event_description")
    list_filter = ("significance", "event_date")
    autocomplete_fields = ("place",)
    inlines = [EventPhotoInline]  # attach up to 10 photos


@admin.register(HistoricPerson)
class HistoricPersonAdmin(admin.ModelAdmin):
    list_display = ("id", "last_name", "first_name", "dob", "date_modified")
    search_fields = ("first_name", "last_name", "brief")
    autocomplete_fields = ("profile_photo",)
    inlines = [EventPersonInline]  # link many events to this person


@admin.register(PersonPlace)
class PersonPlaceAdmin(admin.ModelAdmin):
    list_display = ("id",
                    "person",
                    "place",
                    "association_date",
                    "association_type")
    search_fields = ("association_type",)
    autocomplete_fields = ("person", "place")


@admin.register(EventPerson)
class EventPersonAdmin(admin.ModelAdmin):
    list_display = ("id", "event", "person", "role")
    search_fields = ("role",)
    autocomplete_fields = ("event", "person")
