import json

from asgiref.sync import sync_to_async
from django.db import transaction
from django.http import JsonResponse

from common import report as report_service

from ..models import AnalysisReport, AuthKey, CompanyInfo, JobDescription, Resume
from .columns import RESUME_ADD_ALLOWED_FIELDS, RESUME_ADD_BLOCKED_FIELDS, RESUME_MODIFY_BLOCKED_FIELDS
from .error_code import error_code
from .utils import editable_model_fields


def _get_analysis_inputs(request, resume_id):
    if request.user.is_authenticated:
        resumes = Resume.objects.select_related(
            "job_description",
            "job_description__account",
        ).filter(id=resume_id, job_description__account=request.user)
    else:
        api_key = request.headers.get("X-API-Key")

        if not api_key:
            raise PermissionError("User is not authenticated.")

        try:
            auth_key = AuthKey.objects.select_related("account").get(value=api_key)
        except AuthKey.DoesNotExist as exc:
            raise PermissionError("User is not authenticated.") from exc

        resumes = Resume.objects.select_related(
            "job_description",
            "job_description__account",
        ).filter(
            id=resume_id,
            id__in=auth_key.authorized_resume or [],
            job_description__account=auth_key.account,
        )

    try:
        resume = resumes.get()
    except Resume.DoesNotExist:
        return None

    job_description = resume.job_description
    company_info, _ = CompanyInfo.objects.get_or_create(account=job_description.account)

    resume.status = Resume.STATUS_PROCESSING
    resume.save(update_fields=["status", "updated_at"])

    return resume.id, resume.to_dict(), company_info.to_dict(), job_description.to_dict()


def _save_analysis_result(resume_id, analysis_result):
    report_data = analysis_result.get("report") or {}
    question_items = analysis_result.get("questions") or []
    interview_question = [
        {
            "question": item.get("question", ""),
            "answer": item.get("answer", ""),
            "purpose": item.get("purpose", ""),
        }
        for item in question_items
        if item.get("question")
    ]

    def report_text(key):
        value = report_data.get(key, "")

        if isinstance(value, list):
            return "\n".join(str(item) for item in value if item)

        return value or ""

    with transaction.atomic():
        report = AnalysisReport.objects.create(
            resume_id=resume_id,
            overall_grade=report_data.get("overall_grade", ""),
            overall_summary=report_data.get("overall_summary", ""),
            candidate_summary=report_data.get("candidate_summary", ""),
            checklist=report_data.get("checklist", []),
            competency_analysis=report_data.get("competency_analysis", []),
            fit_analysis=report_text("fit_analysis"),
            motive=report_text("motive"),
            collaboration=report_text("collaboration"),
            strength=report_data.get("strength", []),
            concern=report_data.get("concern", []),
            check_point=report_data.get("check_point", []),
            interview_question=interview_question,
            final_comment=report_data.get("final_comment", ""),
        )

        Resume.objects.filter(id=resume_id).update(status=Resume.STATUS_DONE)

    return report.to_dict()


async def _resume_analyze_async(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    data = json.loads(request.body or "{}")
    resume_id = data.get("id")

    if not resume_id:
        return JsonResponse({"error": True, "message": error_code("Resume id is required.", 401)}, status=400)

    try:
        inputs = await sync_to_async(_get_analysis_inputs)(request, resume_id)
    except PermissionError as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 403)}, status=400)

    if inputs is None:
        return JsonResponse({"error": True, "message": error_code("Resume does not exist.", 400)}, status=400)

    resume_id, resume_dict, company_dict, jd_dict = inputs
    analysis_result = await sync_to_async(report_service.invoke, thread_sensitive=False)(
        resume_dict,
        company_dict,
        jd_dict,
    )
    saved_result = await sync_to_async(_save_analysis_result)(resume_id, analysis_result)

    return JsonResponse({"error": False, "data": saved_result})


def resume_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        data = json.loads(request.body or "{}")
        job_description_id = data.get("job_description_id")

        if not job_description_id:
            return JsonResponse({"error": True, "message": error_code("JobDescription id is required.", 401)}, status=400)

        for key in RESUME_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be set.", 402)}, status=400)

        for key in data:
            if key not in RESUME_ADD_ALLOWED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"Invalid resume field: {key}", 402)}, status=400)

        try:
            job_description = JobDescription.objects.get(id=job_description_id, account=request.user)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

        resume = Resume.objects.create(
            job_description=job_description,
            name=data.get("name", ""),
            skill=data.get("skill", []),
            education_level=data.get("education_level", {}),
            experience=data.get("experience", []),
            self_intoduction=data.get("self_intoduction", []),
            certification=data.get("certification", []),
            language=data.get("language", []),
            award=data.get("award", []),
            training=data.get("training", []),
            other_activity=data.get("other_activity", []),
        )

        return JsonResponse({"error": False, "data": resume.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def resume_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")

        if request.user.is_authenticated:
            resumes = Resume.objects.filter(job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            resumes = Resume.objects.filter(
                id__in=auth_key.authorized_resume or [],
                job_description__account=auth_key.account,
            )

        if "job_description_id" in data:
            resumes = resumes.filter(job_description_id=data["job_description_id"])

        if "id" in data:
            resume_id = data["id"]

            if isinstance(resume_id, list):
                resumes = resumes.filter(id__in=resume_id)
            else:
                resumes = resumes.filter(id=resume_id)

        resumes = resumes.order_by("id")
        return JsonResponse({"error": False, "data": [resume.to_dict() for resume in resumes]})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def resume_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("id")

        if not resume_id:
            return JsonResponse({"error": True, "message": error_code("Resume id is required.", 401)}, status=400)

        if request.user.is_authenticated:
            resumes = Resume.objects.filter(job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            resumes = Resume.objects.filter(
                id__in=auth_key.authorized_resume or [],
                job_description__account=auth_key.account,
            )

        try:
            resume = resumes.get(id=resume_id)
        except Resume.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("Resume does not exist.", 400)}, status=400)

        if data.get("delete") is True:
            resume_data = resume.to_dict()
            resume.delete()
            return JsonResponse({"error": False, "data": resume_data})

        resume_fields = editable_model_fields(resume, RESUME_MODIFY_BLOCKED_FIELDS)

        for key, value in data.items():
            if key == "delete":
                continue

            if key in RESUME_MODIFY_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in resume_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid resume field: {key}", 402)}, status=400)

            setattr(resume, key, value)

        resume.save()

        return JsonResponse({"error": False, "data": resume.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


async def resume_analyze(request):
    try:
        return await _resume_analyze_async(request)
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
