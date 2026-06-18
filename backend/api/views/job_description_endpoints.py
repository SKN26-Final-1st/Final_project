import json

from django.http import JsonResponse

from ..models import JobDescription
from .columns import JOB_DESCRIPTION_ADD_BLOCKED_FIELDS, JOB_DESCRIPTION_BLOCKED_FIELDS
from .error_code import error_code
from .utils import accessible_job_descriptions, editable_model_fields, get_job_description_dicts


def jd_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        required_fields = {
            "job_name",
        }

        for key in JOB_DESCRIPTION_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be set.", 402)}, status=400)

        if not all(data.get(field) for field in required_fields):
            return JsonResponse({"error": True, "message": error_code("Need to fill in required fields.", 401)}, status=400)

        status = data.get("status", JobDescription.STATUS_PREPARE)
        valid_statuses = {
            JobDescription.STATUS_PREPARE,
            JobDescription.STATUS_ON_GOING,
            JobDescription.STATUS_CLOSED,
        }

        if status not in valid_statuses:
            return JsonResponse({"error": True, "message": error_code("Invalid status.", 402)}, status=400)

        job_description = JobDescription.objects.create(
            account=request.user,
            job_name=data["job_name"],
            education_level=data.get("education_level", ""),
            major=data.get("major", ""),
            career_level=data["career_level"],
            required_skill=data["required_skill"],
            preferred_skill=data.get("preferred_skill", []),
            main_task=data.get("main_task", ""),
            hiring_reason=data.get("hiring_reason", ""),
            work_type=data.get("work_type", ""),
            status=status,
        )

        return JsonResponse({"error": False, "data": job_description.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def jd_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        try:
            job_descriptions = get_job_description_dicts(request)
        except PermissionError:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        return JsonResponse({
            "error": False,
            "data": job_descriptions,
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def jd_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        job_description_id = data.get("id")

        if not job_description_id:
            return JsonResponse({"error": True, "message": error_code("JobDescription id is required.", 401)}, status=400)

        try:
            job_description_queryset = accessible_job_descriptions(request)
        except PermissionError:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        try:
            job_description = job_description_queryset.get(id=job_description_id)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

        if data.get("delete") is True:
            job_description_data = job_description.to_dict()
            job_description.delete()
            return JsonResponse({"error": False, "data": job_description_data})

        job_description_fields = editable_model_fields(job_description, JOB_DESCRIPTION_BLOCKED_FIELDS)

        for key, value in data.items():
            if key == "delete":
                continue

            if key in JOB_DESCRIPTION_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in job_description_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid job description field: {key}", 402)}, status=400)

            if key == "status":
                valid_statuses = {
                    JobDescription.STATUS_PREPARE,
                    JobDescription.STATUS_ON_GOING,
                    JobDescription.STATUS_CLOSED,
                }

                if value not in valid_statuses:
                    return JsonResponse({"error": True, "message": error_code("Invalid status.", 402)}, status=400)

            setattr(job_description, key, value)

        job_description.save()

        return JsonResponse({"error": False, "data": job_description.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def jd_analyze(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        return JsonResponse({"error": False, "data": {}})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
