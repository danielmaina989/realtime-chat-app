from django.contrib import admin
from .models import Message

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('username', 'room_name', 'content', 'timestamp')
    list_filter = ('room_name', 'timestamp')
    search_fields = ('username', 'content')
