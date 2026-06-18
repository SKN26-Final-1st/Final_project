import json

from django.http import JsonResponse

from ..models import AuthKey, Resume
from .columns import (
    AUTH_KEY_ADD_ALLOWED_FIELDS,
    AUTH_KEY_ADD_BLOCKED_FIELDS,
    AUTH_KEY_BLOCKED_FIELDS,
    AUTH_KEY_MODIFY_BLOCKED_FIELDS,
    AUTH_KEY_MODIFY_CONTROL_FIELDS,
)
from .error_code import error_code
from .utils import editable_model_fields


def _validate_authorized_resume(account, authorized_resume):
    if not isinstance(authorized_resume, list):
        return JsonResponse(
            {"error": True, "message": error_code("Authorized resume must be a list.", 400)},
            status=400,
        )

    if not authorized_resume:
        return None

    try:
        unique_resume_ids = set(authorized_resume)
    except TypeError:
        return JsonResponse(
            {"error": True, "message": error_code("Authorized resume contains invalid resume id.", 402)},
            status=400,
        )

    if len(authorized_resume) != len(unique_resume_ids):
        return JsonResponse(
            {"error": True, "message": error_code("Authorized resume contains duplicated resume id.", 406)},
            status=400,
        )

    try:
        resume_count = Resume.objects.filter(
            id__in=unique_resume_ids,
            job_description__account=account,
        ).count()
    except (TypeError, ValueError):
        return JsonResponse(
            {"error": True, "message": error_code("Authorized resume contains invalid resume id.", 402)},
            status=400,
        )

    if resume_count != len(unique_resume_ids):
        return JsonResponse(
            {"error": True, "message": error_code("Authorized resume contains invalid resume id.", 402)},
            status=400,
        )

    return None


def authkey_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        description = data.get("description", "")
        name = data.get("name", "")
        credit_limit = data.get("credit_limit", 0)
        authorized_resume = data.get("authorized_resume", [])

        for key in AUTH_KEY_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be set.", 402)}, status=400)

        for key in data:
            if key not in AUTH_KEY_ADD_ALLOWED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"Invalid auth key field: {key}", 402)}, status=400)

        if not name:
            return JsonResponse({"error": True, "message": error_code("Name is required.", 401)}, status=400)

        validation_error = _validate_authorized_resume(request.user, authorized_resume)

        if validation_error is not None:
            return validation_error

        auth_key = AuthKey.objects.create(
            account=request.user,
            name=name,
            description=description,
            credit_limit=credit_limit,
            authorized_resume=authorized_resume,
        )

        return JsonResponse({"error": False, "data": auth_key.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def authkey_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        auth_keys = AuthKey.objects.filter(account=request.user).order_by("id")
        data = []

        for auth_key in auth_keys:
            auth_key_data = auth_key.to_dict()
            value = auth_key_data["value"]
            if value.startswith("sk_live_") and len(value) > 11:
                auth_key_data["value"] = f"sk_live_****{value[-4:]}"
            else:
                auth_key_data["value"] = f"****{value[-4:]}" if value else ""

            data.append(auth_key_data)

        return JsonResponse({"error": False, "data": data})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def authkey_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        authkey_id = data.get("id")

        if not authkey_id:
            return JsonResponse({"error": True, "message": error_code("AuthKey id is required.", 401)}, status=400)

        try:
            auth_key = AuthKey.objects.get(id=authkey_id, account=request.user)
        except AuthKey.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("AuthKey does not exist.", 400)}, status=400)

        if data.get("delete") is True:
            auth_key.delete()
            return JsonResponse({"error": False})

        auth_key_fields = editable_model_fields(auth_key, AUTH_KEY_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in {"id"} | AUTH_KEY_MODIFY_CONTROL_FIELDS:
                continue

            if key in AUTH_KEY_MODIFY_BLOCKED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in auth_key_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid auth key field: {key}", 402)}, status=400)

            if key == "authorized_resume":
                validation_error = _validate_authorized_resume(request.user, value)

                if validation_error is not None:
                    return validation_error

            setattr(auth_key, key, value)

        auth_key.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
