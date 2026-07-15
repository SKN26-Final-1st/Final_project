import json
import secrets
import string

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

from ..models import Account
from .columns import ACCOUNT_BLOCKED_FIELDS
from .error_code import error_code
from .utils import editable_model_fields


@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"error": False, "message": "CSRF cookie set"})


def account_signin(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")
        password = data.get("password")
        name = data.get("name")
        verification_question = data.get("verification_question")
        verification_answer = data.get("verification_answer")

        if not all([username, password, name, verification_question, verification_answer]):
            return JsonResponse({"error": True, "message": error_code("Need to fill in required fields.", 401)}, status=400)

        if Account.objects.filter(username=username).exists():
            return JsonResponse({"error": True, "message": error_code("Username already exists.", 406)}, status=400)

        Account.objects.create_user(
            username=username,
            password=password,
            name=name,
            verification_question=verification_question,
            verification_answer=verification_answer,
        )

        return JsonResponse({"error": False, "signin": True})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def account_login(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return JsonResponse({"error": True, "message": error_code("Username and password are required.", 401)}, status=400)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({"error": False, "login": True})
        else:
            return JsonResponse({"error": True, "message": error_code("Invalid credentials", 403)})

    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def account_logout(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        if request.user.is_authenticated:
            logout(request)
            return JsonResponse({"error": False, "logout": True})
        else:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)}, status=400)
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def check_user(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")

        if not username:
            return JsonResponse({"error": True, "message": error_code("Username is required.", 401)}, status=400)

        valid = not Account.objects.filter(username=username).exists()
        return JsonResponse({"error": False, "valid": valid})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def password_question(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")

        if not username:
            return JsonResponse({"error": True, "message": error_code("Username is required.", 401)}, status=400)

        try:
            user = Account.objects.get(username=username)
        except Account.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("User does not exist.", 400)}, status=400)

        return JsonResponse({
            "error": False,
            "verification_question": user.verification_question or "",
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def password_reset(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")
        verification_answer = data.get("verification_answer") or data.get("answer")

        if not all([username, verification_answer]):
            return JsonResponse({"error": True, "message": error_code("Need to fill in required fields.", 401)}, status=400)

        try:
            user = Account.objects.get(username=username)
        except Account.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("User does not exist.", 400)}, status=400)

        if user.verification_answer != verification_answer:
            return JsonResponse({"error": True, "message": error_code("Verification answer is incorrect.", 402)}, status=400)

        password = "".join(secrets.choice(string.ascii_lowercase) for _ in range(8))
        user.set_password(password)
        user.save(update_fields=["password"])

        return JsonResponse({"error": False, "password": password})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def account_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        return JsonResponse({"error": False, "data": request.user.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def account_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        user = request.user

        if data.get("delete") is True:
            logout(request)
            user.delete()
            return JsonResponse({"error": False, "delete": True})

        for key in ACCOUNT_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

        if "password" in data:
            formal_password = data.get("formal_password")

            if not formal_password:
                return JsonResponse({"error": True, "message": error_code("Formal password is required.", 401)}, status=400)

            if not user.check_password(formal_password):
                return JsonResponse({"error": True, "message": error_code("Formal password is incorrect.", 402)}, status=400)

            user.set_password(data["password"])

        account_fields = editable_model_fields(user, ACCOUNT_BLOCKED_FIELDS | {"password"})

        for key, value in data.items():
            if key in {"password", "formal_password", "delete"}:
                continue

            if key not in account_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid account field: {key}", 402)}, status=400)

            setattr(user, key, value)

        user.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
