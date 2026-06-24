import json

from asgiref.sync import sync_to_async
from django.http import JsonResponse

from common.chat_graph import invoke_graph

from .error_code import error_code
from .utils import get_job_description_dicts


async def chat(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        chats = data.get("chat")

        if not isinstance(chats, list):
            return JsonResponse({"error": True, "message": error_code("Chat must be a list.", 400)}, status=400)

        for chat_item in chats:
            if not isinstance(chat_item, dict):
                return JsonResponse({"error": True, "message": error_code("Chat items must be objects.", 400)}, status=400)

            if chat_item.get("role") not in {"user", "agent"}:
                return JsonResponse({"error": True, "message": error_code("Chat role must be user or agent.", 400)}, status=400)

            if not isinstance(chat_item.get("message"), str):
                return JsonResponse({"error": True, "message": error_code("Chat message must be a string.", 400)}, status=400)

        try:
            job_descriptions = await sync_to_async(get_job_description_dicts)(request, masked=True)
        except PermissionError as error:
            return JsonResponse({"error": True, "message": error_code(str(error), 403)})

        response = await invoke_graph({
            "chats": list(chats),
            "job_descriptions": job_descriptions,
        })

        return JsonResponse({
            "error": False,
            "response": {
                "role": "agent",
                "message": response,
            },
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
