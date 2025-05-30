from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Message  # assuming you have a Message model
from .serializers import MessageSerializer

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

class MessageListView(APIView):
    def get(self, request, room_name):
        messages = Message.objects.filter(room_name=room_name).order_by("timestamp")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)



def chat_room(request, room_name):
    username = request.user.username if request.user.is_authenticated else "Guest"
    return render(request, 'chat/chat_room.html', {
        'room_name': room_name,
        'username': username,
    })