# core/cms_admin.py
from django.contrib.admin import AdminSite
from .models import (
    HistoricPlace, HistoricEvent, HistoricPerson, Photo)
from .admin import (
    HistoricPlaceAdmin, HistoricEventAdmin, HistoricPersonAdmin, PhotoAdmin
)


class ContentAdminSite(AdminSite):
    site_header = "Cairo CMS"
    site_title = "Cairo CMS"
    index_title = "Content Management"

    def has_permission(self, request):
        user = request.user
        return user.is_active and (
            user.is_superuser or user.groups.filter(name="Editors").exists()
        )

    # NEW: force the order: Places, Events, Persons
    def get_app_list(self, request):
        # get default list then rearrange
        app_list = super().get_app_list(request)
        # We only registered these models for CMS; but we’ll sort to be safe.
        order = ["Historic places", "Historic events", "Historic persons"]
        for app in app_list:
            app["models"].sort(
                key=lambda m: order.index(
                    m["name"]
                ) if m["name"] in order else 999
            )
        return app_list


class HiddenPhotoAdmin(PhotoAdmin):
    def has_module_permission(self, request):
        return False  # stays hidden from the CMS index


content_admin_site = ContentAdminSite(name="content_admin")

# Register only the three visible models
content_admin_site.register(HistoricPlace, HistoricPlaceAdmin)
content_admin_site.register(HistoricEvent, HistoricEventAdmin)
content_admin_site.register(HistoricPerson, HistoricPersonAdmin)
content_admin_site.register(Photo, HiddenPhotoAdmin)
