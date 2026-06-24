from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def ping(request):
    return JsonResponse({"ok": True}, status=200)
