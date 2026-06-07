from django.http import JsonResponse

from .models import Block


def dbcheck(request):
    if request.method != "GET":
        return JsonResponse({"error": True, "message": "GET request required."}, status=405)

    try:
        blocks = list(Block.objects.values("id", "name", "cnt").order_by("id"))
        return JsonResponse({"error": False, "data": blocks})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)}, status=500)


def accounts_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def accounts_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def accounts_search(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def compinfo_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def compinfo_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def compinfo_search(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_search(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_search(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def report_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def report_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def report_search(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def question_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def question_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def question_search(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})
