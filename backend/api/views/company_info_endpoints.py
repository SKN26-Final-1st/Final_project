import json

from django.http import JsonResponse

from ..models import CompanyInfo
from .columns import COMPANY_INFO_BLOCKED_FIELDS
from .error_code import error_code
from .utils import editable_model_fields


def compinfo_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        company_info, _ = CompanyInfo.objects.get_or_create(account=request.user)

        return JsonResponse({"error": False, "data": company_info.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def compinfo_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        company_info, _ = CompanyInfo.objects.get_or_create(account=request.user)

        company_info_fields = editable_model_fields(company_info, COMPANY_INFO_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in COMPANY_INFO_BLOCKED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in company_info_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid company info field: {key}", 402)}, status=400)

            setattr(company_info, key, value)

        company_info.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
