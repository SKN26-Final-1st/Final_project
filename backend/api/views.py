import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import CompanyInfo


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


def account_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        subscribe_expiration = request.user.subscribe_expiration

        return JsonResponse({
            "error": False,
            "data": {
                "name": request.user.name,
                "verification_question": request.user.verification_question,
                "verification_answer": request.user.verification_answer,
                "credit": request.user.credit,
                "subscribe": request.user.subscribe,
                "subscribe_expiration": subscribe_expiration.date().isoformat()
                if subscribe_expiration else None,
            },
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def account_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        data = json.loads(request.body or "{}")
        user = request.user

        blocked_fields = {"id", "username"}

        for key in blocked_fields:
            if key in data:
                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

        if "password" in data:
            formal_password = data.get("formal_password")

            if not formal_password:
                return JsonResponse({"error": True, "message": "Formal password is required."}, status=400)

            if not user.check_password(formal_password):
                return JsonResponse({"error": True, "message": "Formal password is incorrect."}, status=400)

            user.set_password(data["password"])

        account_fields = {
            field.name
            for field in user._meta.fields
            if field.name not in blocked_fields | {"password"}
        }

        for key, value in data.items():
            if key in {"password", "formal_password"}:
                continue

            if key not in account_fields:
                return JsonResponse({"error": True, "message": f"Invalid account field: {key}"}, status=400)

            setattr(user, key, value)

        user.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def compinfo_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        company_info, _ = CompanyInfo.objects.get_or_create(account=request.user)

        return JsonResponse({
            "error": False,
            "data": {
                "company_name": company_info.company_name,
                "employee_count": company_info.employee_count,
                "team_composition": company_info.team_composition,
                "company_description": company_info.company_description,
                "employ_style": company_info.employ_style,
            },
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def compinfo_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        data = json.loads(request.body or "{}")
        company_info, _ = CompanyInfo.objects.get_or_create(account=request.user)

        blocked_fields = {"id", "account", "account_id"}
        company_info_fields = {
            field.name
            for field in company_info._meta.fields
            if field.name not in blocked_fields
        }

        for key, value in data.items():
            if key in blocked_fields:
                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

            if key not in company_info_fields:
                return JsonResponse({"error": True, "message": f"Invalid company info field: {key}"}, status=400)

            setattr(company_info, key, value)

        company_info.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def authkey_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def authkey_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def authkey_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_analize(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def report_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def question_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})
