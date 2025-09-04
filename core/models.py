# core/models.py
from django.db import models
from django.utils import timezone
from django.core.validators import (
    MaxLengthValidator, MinValueValidator, MaxValueValidator
)
from django.core.exceptions import ValidationError
from django.db.models import F, Q


class Photo(models.Model):
    class FileType(models.TextChoices):
        PNG = "png", "png"
        JPG = "jpg", "jpg"
        JPEG = "jpeg", "jpeg"

    # NEW: actual uploaded file → this gives you the “Browse…” button
    image = models.ImageField(upload_to="photos/%Y/%m/")

    # Keep your metadata, but make them read-only/auto-populated
    file_name = models.CharField(max_length=255, editable=False, blank=True)
    file_path = models.CharField(max_length=500, editable=False, blank=True)
    file_type = models.CharField(
        max_length=10, choices=FileType.choices, blank=True, editable=False
    )
    caption = models.CharField(max_length=250, blank=True)
    upload_date = models.DateTimeField(default=timezone.now)
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        editable=False
    )

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-upload_date"]
        indexes = [models.Index(fields=["file_name"])]

    def save(self, *args, **kwargs):
        if self.image and hasattr(self.image, "name"):
            name = self.image.name.rsplit("/", 1)[-1]
            self.file_name = name
            self.file_path = self.image.name
            ext = name.split(".")[-1].lower()
            if ext in dict(self.FileType.choices):
                self.file_type = ext
            try:
                self.file_size = self.image.size
            except Exception:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.file_name or self.image.name}"


class HistoricPerson(models.Model):
    first_name = models.CharField(max_length=25)
    last_name = models.CharField(max_length=25)
    dob = models.DateField(null=True, blank=True)
    brief = models.CharField(max_length=250, blank=True)
    biography = models.TextField(
        blank=True,
        validators=[MaxLengthValidator(10000)]
    )

    profile_photo = models.OneToOneField(
        Photo,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="profile_of"
    )

    date_added = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    # (Optional convenience relation for queries; admin will use inline anyway)
    events = models.ManyToManyField(
        "HistoricEvent",
        through="EventPerson",
        related_name="people",
        blank=True
    )

    class Meta:
        ordering = ["last_name", "first_name"]
        indexes = [models.Index(fields=["last_name", "first_name"])]

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"


class HistoricPlace(models.Model):
    place_name = models.CharField(max_length=50)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=8,
        validators=[MinValueValidator(-90), MaxValueValidator(90)]
    )
    longitude = models.DecimalField(
        max_digits=11, decimal_places=8,
        validators=[MinValueValidator(-180), MaxValueValidator(180)]
    )
    date_start = models.DateField(null=True, blank=True)
    date_end = models.DateField(null=True, blank=True)
    brief = models.CharField(max_length=250, blank=True)
    history = models.TextField(
        blank=True,
        validators=[MaxLengthValidator(10000)]
    )

    date_added = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["place_name"]
        indexes = [models.Index(fields=["place_name"])]
        constraints = [
            models.CheckConstraint(
                name="place_valid_dates",
                check=Q(date_start__isnull=True)
                | Q(date_end__isnull=True)
                | Q(date_end__gte=F("date_start")),
            ),
        ]

    def __str__(self):
        return self.place_name


class HistoricEvent(models.Model):
    class Significance(models.TextChoices):
        LOCAL = "LOCAL", "Local"
        REGIONAL = "REGIONAL", "Regional"
        NATIONAL = "NATIONAL", "National"
        GLOBAL = "GLOBAL", "Global"

    event_name = models.CharField(max_length=100)
    event_date = models.DateField()
    event_description = models.TextField(
        validators=[MaxLengthValidator(10000)]
    )
    significance = models.CharField(
        max_length=50, choices=Significance.choices, blank=True
    )

    # REQUIRED FK to place
    place = models.ForeignKey(
        HistoricPlace,
        on_delete=models.PROTECT,
        related_name="events",
    )

    date_added = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-event_date", "event_name"]
        indexes = [models.Index(fields=["event_date"])]

    def __str__(self):
        return f"{self.event_name} ({self.event_date})"


# ---------- Junction / Association tables ----------

class PersonPlace(models.Model):
    person = models.ForeignKey(HistoricPerson, on_delete=models.CASCADE)
    place = models.ForeignKey(HistoricPlace, on_delete=models.CASCADE)
    association_date = models.DateField(null=True, blank=True)
    association_type = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["-association_date", "person_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["person", "place", "association_date"],
                name="uniq_person_place_date",
            ),
        ]

    def __str__(self):
        ad = self.association_date or "?"
        return f"{self.person} @ {self.place} on {ad}"


class EventPerson(models.Model):
    event = models.ForeignKey(HistoricEvent, on_delete=models.CASCADE)
    person = models.ForeignKey(HistoricPerson, on_delete=models.CASCADE)
    role = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["event_id", "person_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "person"],
                name="uniq_event_person"
            ),
        ]

    def save(self, *args, **kwargs):
        """
        Auto-create a PersonPlace row linking the person to the event.place
        (using event_date as association_date) if it doesn't already exist.
        """
        super().save(*args, **kwargs)
        if self.event_id and self.person_id:
            PersonPlace.objects.get_or_create(
                person=self.person,
                place=self.event.place,
                association_date=self.event.event_date,
                defaults={"association_type": "via_event"},
            )

    def __str__(self):
        return f"{self.person} in {self.event} ({self.role or 'role n/a'})"


class PlacePhoto(models.Model):
    place = models.ForeignKey(HistoricPlace, on_delete=models.CASCADE)
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)
    photo_order = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )

    class Meta:
        ordering = ["place_id", "photo_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["place", "photo"],
                name="uniq_place_photo"
            ),
            models.UniqueConstraint(
                fields=["place", "photo_order"], name="uniq_place_photo_order"
            ),
        ]

    def clean(self):
        if self.place_id is None:
            return
        qs = PlacePhoto.objects.filter(place_id=self.place_id)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        if qs.count() >= 10 and not qs.filter(photo_order__lt=10).exists():
            raise ValidationError("A place can have at most 10 photos.")

    def __str__(self):
        return f"Photo {self.photo_id} for {self.place} (#{self.photo_order})"


class EventPhoto(models.Model):  # NEW
    event = models.ForeignKey(HistoricEvent, on_delete=models.CASCADE)
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE)
    photo_order = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )

    class Meta:
        ordering = ["event_id", "photo_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "photo"],
                name="uniq_event_photo"
            ),
            models.UniqueConstraint(
                fields=["event", "photo_order"], name="uniq_event_photo_order"
            ),
        ]

    def clean(self):
        if self.event_id is None:
            return
        qs = EventPhoto.objects.filter(event_id=self.event_id)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        if qs.count() >= 10 and not qs.filter(photo_order__lt=10).exists():
            raise ValidationError("An event can have at most 10 photos.")

    def __str__(self):
        return f"Photo {self.photo_id} for {self.event} (#{self.photo_order})"
