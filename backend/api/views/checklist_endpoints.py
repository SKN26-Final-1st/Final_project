import json

from django.http import JsonResponse

from ..models import Checklist, JobDescription
from .columns import CHECKLIST_ADD_ALLOWED_FIELDS, CHECKLIST_BLOCKED_FIELDS
from .error_code import error_code
from .utils import accessible_job_descriptions, editable_model_fields


def checklist_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        job_description_id = data.get("job_description_id")

        if not job_description_id:
            return JsonResponse({"error": True, "message": error_code("JobDescription id is required.", 401)}, status=400)

        try:
            job_description_queryset = accessible_job_descriptions(request)
        except PermissionError:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        if not job_description_queryset.filter(id=job_description_id).exists():
            return JsonResponse({"error": False, "data": []})

        checklists = Checklist.objects.filter(job_description_id=job_description_id).order_by("id")
        return JsonResponse({"error": False, "data": [checklist.to_dict() for checklist in checklists]})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def checklist_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        job_description_id = data.get("job_description_id")
        content = data.get("content")

        if not job_description_id:
            return JsonResponse({"error": True, "message": error_code("JobDescription id is required.", 401)}, status=400)

        if not content:
            return JsonResponse({"error": True, "message": error_code("Need to fill in required fields.", 401)}, status=400)

        for key in data:
            if key not in CHECKLIST_ADD_ALLOWED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"Invalid checklist field: {key}", 402)}, status=400)

        try:
            job_description = JobDescription.objects.get(id=job_description_id, account=request.user)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

        checklist = Checklist.objects.create(
            job_description=job_description,
            content=content,
        )

        return JsonResponse({"error": False, "data": checklist.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def checklist_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        checklist_id = data.get("id")

        if not checklist_id:
            return JsonResponse({"error": True, "message": error_code("Checklist id is required.", 401)}, status=400)

        try:
            job_description_queryset = accessible_job_descriptions(request)
        except PermissionError:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        try:
            checklist = Checklist.objects.select_related("job_description").get(
                id=checklist_id,
                job_description__in=job_description_queryset,
            )
        except Checklist.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("Checklist does not exist.", 400)}, status=400)

        if data.get("delete") is True:
            checklist_data = checklist.to_dict()
            checklist.delete()
            return JsonResponse({"error": False, "data": checklist_data})

        checklist_fields = editable_model_fields(checklist, CHECKLIST_BLOCKED_FIELDS)

        for key, value in data.items():
            if key == "delete":
                continue

            if key in CHECKLIST_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in checklist_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid checklist field: {key}", 402)}, status=400)

            if key == "content" and not value:
                return JsonResponse({"error": True, "message": error_code("Need to fill in required fields.", 401)}, status=400)

            setattr(checklist, key, value)

        checklist.save()

        return JsonResponse({"error": False, "data": checklist.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
