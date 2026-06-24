import json

from django.http import JsonResponse

from ..models import AnalysisReport, AuthKey, JobDescription, Resume
from ..tasks import analyze_and_save_report, enqueue_report_analyze, is_celery_worker_available
from .columns import RESUME_ADD_ALLOWED_FIELDS, RESUME_ADD_BLOCKED_FIELDS, RESUME_MODIFY_BLOCKED_FIELDS
from .error_code import error_code
from .utils import editable_model_fields


def _get_analysis_resume(request, resume_id):
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

    return resume


def resume_analyze(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("id")

        if not resume_id:
            return JsonResponse({"error": True, "message": error_code("Resume id is required.", 401)}, status=400)

        try:
            resume = _get_analysis_resume(request, resume_id)
        except PermissionError as error:
            return JsonResponse({"error": True, "message": error_code(str(error), 403)}, status=400)

        if resume is None:
            return JsonResponse({"error": True, "message": error_code("Resume does not exist.", 400)}, status=400)

        celery_worker_available = is_celery_worker_available()

        report = AnalysisReport.objects.create(
            resume=resume,
            overall_grade="",
            overall_summary="",
            candidate_summary="",
            checklist=[],
            competency_analysis=[],
            fit_analysis="",
            motive="",
            collaboration="",
            strength=[],
            concern=[],
            check_point=[],
            interview_question=[],
            final_comment="",
            status=AnalysisReport.STATUS_ONQUEUE,
        )

        if not celery_worker_available:
            saved_result = analyze_and_save_report(report.id)

            if saved_result is None:
                return JsonResponse({"error": True, "message": error_code("Report does not exist.", 400)}, status=400)

            return JsonResponse({"error": False, "data": saved_result})

        try:
            enqueue_report_analyze.delay(report.id)
        except Exception:
            saved_result = analyze_and_save_report(report.id)

            if saved_result is None:
                return JsonResponse({"error": True, "message": error_code("Report does not exist.", 400)}, status=400)

            return JsonResponse({"error": False, "data": saved_result})

        return JsonResponse({"error": False, "data": report.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


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
