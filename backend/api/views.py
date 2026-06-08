import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Block


def dbcheck(request):
    if request.method != "GET":
        return JsonResponse({"error": True, "message": "GET request required."}, status=405)

    try:
        blocks = list(Block.objects.values("id", "name", "cnt").order_by("id"))
        return JsonResponse({"error": False, "data": blocks})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)}, status=500)


@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"error": False, "message": "CSRF cookie set"})


def account_login(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return JsonResponse({"error": True, "message": "Username and password are required."}, status=400)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({"error": False, "login": True})
        else:
            return JsonResponse({"error": True, "message": "Invalid credentials"})
        
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})

def account_logout(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        if request.user.is_authenticated:
            logout(request)
            return JsonResponse({"error": False, "logout": True})
        else:
            return JsonResponse({"error": True, "message": "User is not authenticated."}, status=401)
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})

def account_define(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def account_modify(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def account_search(request):
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
