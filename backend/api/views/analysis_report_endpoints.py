import json

from django.http import JsonResponse

from ..models import AnalysisReport, AuthKey
from .columns import REPORT_BLOCKED_FIELDS
from .error_code import error_code
from .utils import editable_model_fields


def report_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        report_id = data.get("id")
        resume_id = data.get("resume_id")

        if request.user.is_authenticated:
            reports = AnalysisReport.objects.filter(resume__job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            reports = AnalysisReport.objects.filter(
                resume_id__in=auth_key.authorized_resume or [],
                resume__job_description__account=auth_key.account,
            )

        if report_id:
            try:
                report = reports.get(id=report_id)
            except AnalysisReport.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("Report does not exist.", 400)}, status=400)

            return JsonResponse({"error": False, "data": [report.to_dict()]})

        if not resume_id:
            return JsonResponse({"error": True, "message": error_code("Resume id is required.", 401)}, status=400)

        reports = reports.filter(resume_id=resume_id).order_by("id")

        if not reports.exists():
            return JsonResponse({"error": False, "data": []})

        return JsonResponse({"error": False, "data": [report.to_dict() for report in reports]})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def report_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        report_id = data.get("id")

        if not report_id:
            return JsonResponse({"error": True, "message": error_code("Report id is required.", 401)}, status=400)

        if request.user.is_authenticated:
            reports = AnalysisReport.objects.filter(resume__job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            reports = AnalysisReport.objects.filter(
                resume_id__in=auth_key.authorized_resume or [],
                resume__job_description__account=auth_key.account,
            )

        try:
            report = reports.get(id=report_id)
        except AnalysisReport.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("Report does not exist.", 400)}, status=400)

        if report.status == AnalysisReport.STATUS_PROCESSING:
            return JsonResponse({"error": True, "message": error_code("Report is processing.", 407)}, status=400)

        if data.get("delete") is True:
            report_data = report.to_dict()
            report.delete()
            return JsonResponse({"error": False, "data": report_data})

        report_fields = editable_model_fields(report, REPORT_BLOCKED_FIELDS)

        for key, value in data.items():
            if key == "delete":
                continue

            if key in REPORT_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in report_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid report field: {key}", 402)}, status=400)

            setattr(report, key, value)

        report.save()

        return JsonResponse({"error": False, "data": report.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
