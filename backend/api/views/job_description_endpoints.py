import json

from django.db import transaction
from django.http import JsonResponse

from common import checklist_graph

from ..models import Checklist, CompanyInfo, JobDescription
from ..tasks import (
    enqueue_jd_checklist_analyze,
    generate_and_save_checklists,
    is_celery_worker_available,
)
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
            if job_description.checklist_status == JobDescription.CHECKLIST_STATUS_PROCESSING:
                return JsonResponse({"error": True, "message": error_code("Checklist is processing.", 407)}, status=400)

            job_description_data = job_description.to_dict()
            job_description.delete()
            return JsonResponse({"error": False, "data": job_description_data})

        if data.get("refresh_fail") is True:
            if job_description.checklist_status == JobDescription.CHECKLIST_STATUS_FAIL:
                job_description.checklist_status = JobDescription.CHECKLIST_STATUS_DONE
                job_description.save(update_fields=["checklist_status"])

            return JsonResponse({"error": False, "data": job_description.to_dict()})

        job_description_fields = editable_model_fields(job_description, JOB_DESCRIPTION_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in {"delete", "refresh_fail"}:
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


def _parse_checklist_count(value):
    if value in (None, ""):
        return 0

    if isinstance(value, bool):
        raise ValueError("cnt must be an integer.")

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("cnt must be an integer.") from exc


def _get_jd_analysis_inputs(request, job_description_id, cnt):
    """체크리스트 생성에 필요한 회사/JD 입력과 남은 생성 개수를 준비합니다."""

    job_description_queryset = accessible_job_descriptions(request)
    try:
        job_description = job_description_queryset.select_related("account").get(id=job_description_id)
    except JobDescription.DoesNotExist:
        return None

    company_info, _ = CompanyInfo.objects.get_or_create(account=job_description.account)
    checklist_count = job_description.checklists.count()
    remaining_count = max(0, checklist_graph.CHECKLIST_COUNT - checklist_count)
    generation_count = min(cnt, checklist_graph.CHECKLIST_COUNT) if cnt > 0 else remaining_count

    return {
        "job_description_id": job_description.id,
        "company": company_info.to_masked_dict(),
        "jd": job_description.to_masked_dict(),
        "generation_count": generation_count,
        "save_limit": generation_count,
    }


def _save_generated_checklists(job_description_id, contents, save_limit):
    """생성된 체크리스트 문자열을 남은 개수만큼 DB에 저장합니다."""

    with transaction.atomic():
        try:
            job_description = JobDescription.objects.select_for_update().get(id=job_description_id)
        except JobDescription.DoesNotExist:
            return None

        valid_contents = [
            content.strip()
            for content in contents
            if isinstance(content, str) and content.strip()
        ][:save_limit]

        Checklist.objects.bulk_create(
            [
                Checklist(job_description=job_description, content=content)
                for content in valid_contents
            ]
        )

        checklists = Checklist.objects.filter(job_description=job_description).order_by("id")
        return [checklist.to_dict() for checklist in checklists]


def _jd_analyze(request):
    """JD 분석 API 본문입니다. checklist_graph.invoke()로 체크리스트 LangGraph를 실행합니다."""

    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    data = json.loads(request.body or "{}")
    job_description_id = data.get("id")
    query = data.get("query") or ""
    cnt = _parse_checklist_count(data.get("cnt", 0))

    if not job_description_id:
        return JsonResponse({"error": True, "message": error_code("JobDescription id is required.", 401)}, status=400)

    allowed_keys = {"id", "query", "cnt"}
    if set(data) - allowed_keys:
        return JsonResponse({"error": True, "message": error_code("Only JobDescription id, query, cnt are allowed.", 402)}, status=400)

    try:
        job_description_queryset = accessible_job_descriptions(request)
    except PermissionError:
        return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)}, status=403)

    try:
        job_description = job_description_queryset.get(id=job_description_id)
    except JobDescription.DoesNotExist:
        return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

    if job_description.checklist_status in {
        JobDescription.CHECKLIST_STATUS_ONQUEUE,
        JobDescription.CHECKLIST_STATUS_PROCESSING,
    }:
        return JsonResponse({"error": True, "message": error_code("Checklist is already processing.", 407)}, status=400)

    job_description.checklist_status = JobDescription.CHECKLIST_STATUS_ONQUEUE
    job_description.save(update_fields=["checklist_status"])

    if not is_celery_worker_available():
        generate_and_save_checklists(
            job_description.id,
            query=query,
            cnt=cnt,
        )

        try:
            job_description = job_description_queryset.get(id=job_description_id)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

        return JsonResponse({"error": False, "data": job_description.to_dict()})

    try:
        enqueue_jd_checklist_analyze.delay(
            job_description.id,
            query=query,
            cnt=cnt,
        )
    except Exception:
        job_description.checklist_status = JobDescription.CHECKLIST_STATUS_FAIL
        job_description.save(update_fields=["checklist_status"])

    return JsonResponse({"error": False, "data": job_description.to_dict()})


def jd_analyze(request):
    try:
        return _jd_analyze(request)
    except ValueError as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 402)}, status=400)
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
