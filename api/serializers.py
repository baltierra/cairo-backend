# api/serializers.py
from rest_framework import serializers

# Tip: Keep your DB models in core.models.
# Add serializers here as you create models.


class EmptySerializer(serializers.Serializer):
    """
    Useful for endpoints that don't need request/response fields
    (e.g., health checks). Replace/remove when you add real serializers.
    """
    pass


# Example template for when you add your first model:
#
# from core.models import Note
#
# class NoteSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Note
#         fields = ["id", "title", "body", "created_at"]
