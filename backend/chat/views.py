# chat/views.py
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from .models import Message
import json


@method_decorator(csrf_exempt, name='dispatch')
class MarkAsReadView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            message_id = data.get('message_id')
            user = request.user
            if not user.is_authenticated:
                return JsonResponse({'error': 'Unauthorized'}, status=401)

            message = Message.objects.get(id=message_id)
            message.read_by.add(user)
            return JsonResponse({'success': True, 'message_id': message_id})
        except Message.DoesNotExist:
            return JsonResponse({'error': 'Message not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ReactToMessageView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            message_id = data.get('message_id')
            emoji = data.get('emoji')
            username = request.user.username

            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Unauthorized'}, status=401)

            message = Message.objects.get(id=message_id)
            reactions = message.reactions

            if emoji not in reactions:
                reactions[emoji] = []

            if username in reactions[emoji]:
                reactions[emoji].remove(username)
            else:
                reactions[emoji].append(username)

            # Clean up if list becomes empty
            if not reactions[emoji]:
                del reactions[emoji]

            message.reactions = reactions
            message.save()

            return JsonResponse({'success': True, 'reactions': reactions})
        except Message.DoesNotExist:
            return JsonResponse({'error': 'Message not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
