from django.shortcuts import render
from django.http import JsonResponse
from .models import Message

def mark_as_read(request, chat_user_id):
    if request.method == "POST":
        messages = Message.objects.filter(sender_id=chat_user_id, receiver=request.user, is_read=False)
        for msg in messages:
            msg.is_read = True
            msg.read_by.add(request.user)
            msg.save()
        return JsonResponse({"status": "success"})
