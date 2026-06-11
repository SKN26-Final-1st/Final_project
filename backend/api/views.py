import json
import secrets
import string

from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from asgiref.sync import sync_to_async

from common import report as report_service

from .columns import (
    ACCOUNT_BLOCKED_FIELDS,
    AUTH_KEY_BLOCKED_FIELDS,
    AUTH_KEY_ADD_ALLOWED_FIELDS,
    AUTH_KEY_ADD_BLOCKED_FIELDS,
    AUTH_KEY_MODIFY_BLOCKED_FIELDS,
    AUTH_KEY_MODIFY_CONTROL_FIELDS,
    COMPANY_INFO_BLOCKED_FIELDS,
    JOB_DESCRIPTION_ADD_BLOCKED_FIELDS,
    JOB_DESCRIPTION_BLOCKED_FIELDS,
    QUESTION_BLOCKED_FIELDS,
    REPORT_BLOCKED_FIELDS,
    RESUME_ADD_ALLOWED_FIELDS,
    RESUME_ADD_BLOCKED_FIELDS,
    RESUME_MODIFY_BLOCKED_FIELDS,
)
from .error_code import error_code
from .models import (
    Account,
    AnalysisReport,
    AuthKey,
    CompanyInfo,
    InterviewQuestion,
    JobDescription,
    Resume,
)


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

    with transaction.atomic():
        report, _ = AnalysisReport.objects.update_or_create(
            resume_id=resume_id,
            defaults={
                "overall_grade": report_data.get("overall_grade", ""),
                "overall_summary": report_data.get("overall_summary", ""),
                "candidate_summary": report_data.get("candidate_summary", ""),
                "checklist": report_data.get("checklist", []),
                "competency_analysis": report_data.get("competency_analysis", []),
                "fit_analysis": report_data.get("fit_analysis", []),
                "strength": report_data.get("strength", []),
                "concern": report_data.get("concern", []),
                "check_point": report_data.get("check_point", []),
                "final_comment": report_data.get("final_comment", ""),
            },
        )

        InterviewQuestion.objects.filter(resume_id=resume_id).delete()
        questions = InterviewQuestion.objects.bulk_create([
            InterviewQuestion(
                resume_id=resume_id,
                question=item.get("question", ""),
                answer=item.get("answer", ""),
                purpose=item.get("purpose", ""),
            )
            for item in question_items
            if item.get("question")
        ])

        Resume.objects.filter(id=resume_id).update(status=Resume.STATUS_DONE)

    return {
        "report": report.to_dict(),
        "questions": [question.to_dict() for question in questions],
    }


async def _resume_analize_async(request):
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


def _editable_model_fields(instance, blocked_fields):
    return {
        field.name
        for field in instance._meta.fields
        if field.name not in blocked_fields
    }


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


def chat(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        chats = data.get("chat")

        if not isinstance(chats, list):
            return JsonResponse({"error": True, "message": error_code("Chat must be a list.", 400)}, status=400)

        for chat_item in chats:
            if not isinstance(chat_item, dict):
                return JsonResponse({"error": True, "message": error_code("Chat items must be objects.", 400)}, status=400)

            if chat_item.get("role") not in {"user", "agent"}:
                return JsonResponse({"error": True, "message": error_code("Chat role must be user or agent.", 400)}, status=400)

            if not isinstance(chat_item.get("message"), str):
                return JsonResponse({"error": True, "message": error_code("Chat message must be a string.", 400)}, status=400)

        chats = list(chats)  # 입력 받은 list[dict]
        response = "테스트용 답변"  # API 호출로 받은 agent 답변

        return JsonResponse({
            "error": False,
            "response": {
                "role": "agent",
                "message": response,
            },
        })
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

        account_fields = _editable_model_fields(user, ACCOUNT_BLOCKED_FIELDS | {"password"})

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

        company_info_fields = _editable_model_fields(company_info, COMPANY_INFO_BLOCKED_FIELDS)

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

        for key in AUTH_KEY_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be set.", 402)}, status=400)

        for key in data:
            if key not in AUTH_KEY_ADD_ALLOWED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"Invalid auth key field: {key}", 402)}, status=400)

        if not name:
            return JsonResponse({"error": True, "message": error_code("Name is required.", 401)}, status=400)

        auth_key = AuthKey.objects.create(
            account=request.user,
            name=name,
            description=description,
            credit_limit=credit_limit,
            authorized_resume=[],
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

        auth_key_fields = _editable_model_fields(auth_key, AUTH_KEY_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in {"id"} | AUTH_KEY_MODIFY_CONTROL_FIELDS:
                continue

            if key in AUTH_KEY_MODIFY_BLOCKED_FIELDS:
                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in auth_key_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid auth key field: {key}", 402)}, status=400)

            if key == "authorized_resume":
                if not isinstance(value, list):
                    return JsonResponse({"error": True, "message": error_code("Authorized resume must be a list.", 400)}, status=400)

                if len(value) != len(set(value)):
                    return JsonResponse({"error": True, "message": error_code("Authorized resume contains duplicated resume id.", 406)}, status=400)

                resume_count = Resume.objects.filter(
                    id__in=value,
                    job_description__account=request.user,
                ).count()

                if resume_count != len(set(value)):
                    return JsonResponse({"error": True, "message": error_code("Authorized resume contains invalid resume id.", 402)}, status=400)

            setattr(auth_key, key, value)

        auth_key.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


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

        if request.user.is_authenticated:
            job_descriptions = JobDescription.objects.filter(account=request.user).order_by("id")
            return JsonResponse({
                "error": False,
                "data": [job_description.to_dict() for job_description in job_descriptions],
            })

        api_key = request.headers.get("X-API-Key")

        if not api_key:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        try:
            auth_key = AuthKey.objects.select_related("account").get(value=api_key)
        except AuthKey.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        authorized_resume = auth_key.authorized_resume or []
        job_descriptions = JobDescription.objects.filter(
            account=auth_key.account,
            resumes__id__in=authorized_resume,
        ).distinct().order_by("id")

        return JsonResponse({
            "error": False,
            "data": [job_description.to_dict() for job_description in job_descriptions],
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

        if request.user.is_authenticated:
            job_description_queryset = JobDescription.objects.filter(account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            authorized_resume = auth_key.authorized_resume or []
            job_description_queryset = JobDescription.objects.filter(
                account=auth_key.account,
                resumes__id__in=authorized_resume,
            ).distinct()

        try:
            job_description = job_description_queryset.get(id=job_description_id)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

        if data.get("delete") is True:
            job_description_data = job_description.to_dict()
            job_description.delete()
            return JsonResponse({"error": False, "data": job_description_data})

        job_description_fields = _editable_model_fields(job_description, JOB_DESCRIPTION_BLOCKED_FIELDS)

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

        resume_fields = _editable_model_fields(resume, RESUME_MODIFY_BLOCKED_FIELDS)

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


async def resume_analize(request):
    try:
        return await _resume_analize_async(request)
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def report_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("resume_id")

        if not resume_id:
            return JsonResponse({"error": True, "message": error_code("Resume id is required.", 401)}, status=400)

        if request.user.is_authenticated:
            resume_filter = Resume.objects.filter(id=resume_id, job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            resume_filter = Resume.objects.filter(
                id=resume_id,
                id__in=auth_key.authorized_resume or [],
                job_description__account=auth_key.account,
            )

        if not resume_filter.exists():
            return JsonResponse({"error": False, "data": []})

        reports = AnalysisReport.objects.filter(resume_id=resume_id).order_by("id")
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

        if "delete" in data:
            return JsonResponse({"error": True, "message": error_code("Delete is not allowed.", 407)}, status=400)

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

        report_fields = _editable_model_fields(report, REPORT_BLOCKED_FIELDS)

        for key, value in data.items():
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


def question_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("resume_id")

        if not resume_id:
            return JsonResponse({"error": True, "message": error_code("Resume id is required.", 401)}, status=400)

        if request.user.is_authenticated:
            resume_filter = Resume.objects.filter(id=resume_id, job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            resume_filter = Resume.objects.filter(
                id=resume_id,
                id__in=auth_key.authorized_resume or [],
                job_description__account=auth_key.account,
            )

        if not resume_filter.exists():
            return JsonResponse({"error": False, "data": []})

        questions = InterviewQuestion.objects.filter(resume_id=resume_id).order_by("id")
        return JsonResponse({"error": False, "data": [question.to_dict() for question in questions]})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def question_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

        data = json.loads(request.body or "{}")
        question_id = data.get("id")

        if not question_id:
            return JsonResponse({"error": True, "message": error_code("Question id is required.", 401)}, status=400)

        if "delete" in data:
            return JsonResponse({"error": True, "message": error_code("Delete is not allowed.", 407)}, status=400)

        if request.user.is_authenticated:
            questions = InterviewQuestion.objects.filter(resume__job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

            questions = InterviewQuestion.objects.filter(
                resume_id__in=auth_key.authorized_resume or [],
                resume__job_description__account=auth_key.account,
            )

        try:
            question = questions.get(id=question_id)
        except InterviewQuestion.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("Question does not exist.", 400)}, status=400)

        question_fields = _editable_model_fields(question, QUESTION_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in QUESTION_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": error_code(f"{key} cannot be modified.", 402)}, status=400)

            if key not in question_fields:
                return JsonResponse({"error": True, "message": error_code(f"Invalid question field: {key}", 402)}, status=400)

            setattr(question, key, value)

        question.save()

        return JsonResponse({"error": False, "data": question.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
