from django.db import models

from django.contrib.auth.models import User

class Message(models.Model):
    username = models.CharField(max_length=255)
    avatar_url = models.URLField(blank=True, null=True)
    room = models.CharField(max_length=255)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    # Existing fields you have
    reactions = models.JSONField(default=dict)  # {"😊": ["user1", "user2"], "❤️": ["user3"]}
    read_by = models.ManyToManyField(User, related_name='read_messages', blank=True)

    # New field to track delivery status for each message
    delivered = models.BooleanField(default=False)  # Has server delivered to recipient(s)?

    # Optionally track failed status or other states if needed
    failed = models.BooleanField(default=False)  # Mark if delivery failed (optional)

    def __str__(self):
        return f"{self.username} in {self.room} at {self.timestamp}"
