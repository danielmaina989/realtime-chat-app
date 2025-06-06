from django.db import models

class Message(models.Model):
    username = models.CharField(max_length=255)
    avatar_url = models.URLField(blank=True, null=True)  # New field
    room = models.CharField(max_length=255)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} in {self.room} at {self.timestamp}"


