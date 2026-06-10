import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import (
    Account,
    AnalysisReport,
    AuthKey,
    CompanyInfo,
    InterviewQuestion,
    JobDescription,
    Resume,
)


ACCOUNT_BLOCKED_FIELDS = {"id", "username", "account_hash"}
COMPANY_INFO_BLOCKED_FIELDS = {"id", "account", "account_id"}
AUTH_KEY_BLOCKED_FIELDS = {"id", "account", "account_id", "value"}
AUTH_KEY_ADD_BLOCKED_FIELDS = AUTH_KEY_BLOCKED_FIELDS | {"authorized_resume"}
AUTH_KEY_ADD_ALLOWED_FIELDS = {"name", "description", "credit_limit"}
AUTH_KEY_MODIFY_CONTROL_FIELDS = {"delete"}
AUTH_KEY_MODIFY_BLOCKED_FIELDS = AUTH_KEY_BLOCKED_FIELDS - {"id"}
JOB_DESCRIPTION_BLOCKED_FIELDS = {"id", "account", "account_id", "created_at", "updated_at"}
JOB_DESCRIPTION_ADD_BLOCKED_FIELDS = JOB_DESCRIPTION_BLOCKED_FIELDS
RESUME_BLOCKED_FIELDS = {"id", "created_at", "updated_at", "status", "reviewed", "reviewed_at"}
RESUME_ADD_BLOCKED_FIELDS = RESUME_BLOCKED_FIELDS
RESUME_ADD_ALLOWED_FIELDS = {
    "job_description_id",
    "name",
    "skill",
    "education_level",
    "experience",
    "self_intoduction",
    "certification",
    "language",
    "award",
    "training",
    "other_activity",
}
RESUME_MODIFY_BLOCKED_FIELDS = RESUME_BLOCKED_FIELDS | {"job_description", "job_description_id"}
REPORT_BLOCKED_FIELDS = {"id", "resume", "resume_id"}
QUESTION_BLOCKED_FIELDS = {"id", "resume", "resume_id"}


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
        return JsonResponse({"error": True, "message": "POST request required."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        username = data.get("username")
        password = data.get("password")
        name = data.get("name")
        verification_question = data.get("verification_question")
        verification_answer = data.get("verification_answer")

        if not all([username, password, name, verification_question, verification_answer]):
            return JsonResponse({"error": True, "message": "Need to fill in required fields."}, status=400)

        if Account.objects.filter(username=username).exists():
            return JsonResponse({"error": True, "message": "Username already exists."}, status=400)

        Account.objects.create_user(
            username=username,
            password=password,
            name=name,
            verification_question=verification_question,
            verification_answer=verification_answer,
        )

        return JsonResponse({"error": False, "signin": True})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


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

        return JsonResponse({"error": False, "data": request.user.to_dict()})
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

        if data.get("delete") is True:
            logout(request)
            user.delete()
            return JsonResponse({"error": False, "delete": True})

        for key in ACCOUNT_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

        if "password" in data:
            formal_password = data.get("formal_password")

            if not formal_password:
                return JsonResponse({"error": True, "message": "Formal password is required."}, status=400)

            if not user.check_password(formal_password):
                return JsonResponse({"error": True, "message": "Formal password is incorrect."}, status=400)

            user.set_password(data["password"])

        account_fields = _editable_model_fields(user, ACCOUNT_BLOCKED_FIELDS | {"password"})

        for key, value in data.items():
            if key in {"password", "formal_password", "delete"}:
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

        return JsonResponse({"error": False, "data": company_info.to_dict()})
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

        company_info_fields = _editable_model_fields(company_info, COMPANY_INFO_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in COMPANY_INFO_BLOCKED_FIELDS:
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

        data = json.loads(request.body or "{}")
        description = data.get("description", "")
        name = data.get("name", "")
        credit_limit = data.get("credit_limit", 0)

        for key in AUTH_KEY_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": f"{key} cannot be set."}, status=400)

        for key in data:
            if key not in AUTH_KEY_ADD_ALLOWED_FIELDS:
                return JsonResponse({"error": True, "message": f"Invalid auth key field: {key}"}, status=400)

        if not name:
            return JsonResponse({"error": True, "message": "Name is required."}, status=400)

        auth_key = AuthKey.objects.create(
            account=request.user,
            name=name,
            description=description,
            credit_limit=credit_limit,
            authorized_resume=[],
        )

        return JsonResponse({"error": False, "data": auth_key.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def authkey_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

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
        return JsonResponse({"error": True, "message": str(error)})


def authkey_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        data = json.loads(request.body or "{}")
        authkey_id = data.get("id")

        if not authkey_id:
            return JsonResponse({"error": True, "message": "AuthKey id is required."}, status=400)

        try:
            auth_key = AuthKey.objects.get(id=authkey_id, account=request.user)
        except AuthKey.DoesNotExist:
            return JsonResponse({"error": True, "message": "AuthKey does not exist."}, status=404)

        if data.get("delete") is True:
            auth_key.delete()
            return JsonResponse({"error": False})

        auth_key_fields = _editable_model_fields(auth_key, AUTH_KEY_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in {"id"} | AUTH_KEY_MODIFY_CONTROL_FIELDS:
                continue

            if key in AUTH_KEY_MODIFY_BLOCKED_FIELDS:
                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

            if key not in auth_key_fields:
                return JsonResponse({"error": True, "message": f"Invalid auth key field: {key}"}, status=400)

            if key == "authorized_resume":
                if not isinstance(value, list):
                    return JsonResponse({
                        "error": True,
                        "message": "Authorized resume must be a list.",
                    }, status=400)

                if len(value) != len(set(value)):
                    return JsonResponse({
                        "error": True,
                        "message": "Authorized resume contains duplicated resume id.",
                    }, status=400)

                resume_count = Resume.objects.filter(
                    id__in=value,
                    job_description__account=request.user,
                ).count()

                if resume_count != len(set(value)):
                    return JsonResponse({
                        "error": True,
                        "message": "Authorized resume contains invalid resume id.",
                    }, status=400)

            setattr(auth_key, key, value)

        auth_key.save()

        return JsonResponse({"error": False})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def jd_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        data = json.loads(request.body or "{}")
        required_fields = {
            "job_name",
        }

        for key in JOB_DESCRIPTION_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": f"{key} cannot be set."}, status=400)

        if not all(data.get(field) for field in required_fields):
            return JsonResponse({"error": True, "message": "Need to fill in required fields."}, status=400)

        status = data.get("status", JobDescription.STATUS_PREPARE)
        valid_statuses = {
            JobDescription.STATUS_PREPARE,
            JobDescription.STATUS_ON_GOING,
            JobDescription.STATUS_CLOSED,
        }

        if status not in valid_statuses:
            return JsonResponse({"error": True, "message": "Invalid status."}, status=400)

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
        return JsonResponse({"error": True, "message": str(error)})


def jd_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if request.user.is_authenticated:
            job_descriptions = JobDescription.objects.filter(account=request.user).order_by("id")
            return JsonResponse({
                "error": False,
                "data": [job_description.to_dict() for job_description in job_descriptions],
            })

        api_key = request.headers.get("X-API-Key")

        if not api_key:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        try:
            auth_key = AuthKey.objects.select_related("account").get(value=api_key)
        except AuthKey.DoesNotExist:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

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
        return JsonResponse({"error": True, "message": str(error)})


def jd_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        job_description_id = data.get("id")

        if not job_description_id:
            return JsonResponse({"error": True, "message": "JobDescription id is required."}, status=400)

        if request.user.is_authenticated:
            job_description_queryset = JobDescription.objects.filter(account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            authorized_resume = auth_key.authorized_resume or []
            job_description_queryset = JobDescription.objects.filter(
                account=auth_key.account,
                resumes__id__in=authorized_resume,
            ).distinct()

        try:
            job_description = job_description_queryset.get(id=job_description_id)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": "JobDescription does not exist."}, status=404)

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

                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

            if key not in job_description_fields:
                return JsonResponse({"error": True, "message": f"Invalid job description field: {key}"}, status=400)

            if key == "status":
                valid_statuses = {
                    JobDescription.STATUS_PREPARE,
                    JobDescription.STATUS_ON_GOING,
                    JobDescription.STATUS_CLOSED,
                }

                if value not in valid_statuses:
                    return JsonResponse({"error": True, "message": "Invalid status."}, status=400)

            setattr(job_description, key, value)

        job_description.save()

        return JsonResponse({"error": False, "data": job_description.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_add(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        if not request.user.is_authenticated:
            return JsonResponse({"error": True, "message": "User is not authenticated."})

        data = json.loads(request.body or "{}")
        job_description_id = data.get("job_description_id")

        if not job_description_id:
            return JsonResponse({"error": True, "message": "JobDescription id is required."}, status=400)

        for key in RESUME_ADD_BLOCKED_FIELDS:
            if key in data:
                return JsonResponse({"error": True, "message": f"{key} cannot be set."}, status=400)

        for key in data:
            if key not in RESUME_ADD_ALLOWED_FIELDS:
                return JsonResponse({"error": True, "message": f"Invalid resume field: {key}"}, status=400)

        try:
            job_description = JobDescription.objects.get(id=job_description_id, account=request.user)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": "JobDescription does not exist."}, status=404)

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
        return JsonResponse({"error": True, "message": str(error)})


def resume_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")

        if request.user.is_authenticated:
            resumes = Resume.objects.filter(job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

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
        return JsonResponse({"error": True, "message": str(error)})


def resume_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("id")

        if not resume_id:
            return JsonResponse({"error": True, "message": "Resume id is required."}, status=400)

        if request.user.is_authenticated:
            resumes = Resume.objects.filter(job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            resumes = Resume.objects.filter(
                id__in=auth_key.authorized_resume or [],
                job_description__account=auth_key.account,
            )

        try:
            resume = resumes.get(id=resume_id)
        except Resume.DoesNotExist:
            return JsonResponse({"error": True, "message": "Resume does not exist."}, status=404)

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

                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

            if key not in resume_fields:
                return JsonResponse({"error": True, "message": f"Invalid resume field: {key}"}, status=400)

            setattr(resume, key, value)

        resume.save()

        return JsonResponse({"error": False, "data": resume.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def resume_analize(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("id")

        if not resume_id:
            return JsonResponse({"error": True, "message": "Resume id is required."}, status=400)

        if request.user.is_authenticated:
            resumes = Resume.objects.filter(id=resume_id, job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            resumes = Resume.objects.filter(
                id=resume_id,
                id__in=auth_key.authorized_resume or [],
                job_description__account=auth_key.account,
            )

        try:
            resume = resumes.get()
        except Resume.DoesNotExist:
            return JsonResponse({"error": True, "message": "Resume does not exist."}, status=404)

        report, _ = AnalysisReport.objects.update_or_create(
            resume=resume,
            defaults={
                "overall_grade": "B",
                "overall_summary": (
                    "이수진 지원자는 뛰어난 학력과 백엔드 개발 업무 경험을 갖추었으며, 문제 해결 능력과 "
                    "팀워크가 강점입니다. 그러나 프론트엔드 기술 및 경험이 부족하여 해당 직무 요구사항에 "
                    "다소 미흡한 점이 있습니다."
                ),
                "candidate_summary": (
                    "부산대학교 컴퓨터공학과 학사, KAIST 전산학부 석사 학력을 보유하고 있으며, "
                    "ABC Tech에서 2년 3개월 동안 백엔드 개발자로 근무했습니다. Java, Spring Boot, "
                    "MySQL, Docker 등의 기술 스택 활용 능력이 뛰어나고, REST API 설계 및 연동 경험과 "
                    "협업 능력, 자율적 문제 해결 능력을 겸비하고 있습니다. 정보처리기사, AWS Developer "
                    "Associate 자격증과 TOEIC 925점, JLPT N2 자격도 보유하고 있습니다."
                ),
                "checklist": [
                    {
                        "content": "컴퓨터 공학 또는 관련 전공 학사 학위 이상을 보유하고 있는가?",
                        "result": True,
                    },
                    {
                        "content": "프론트엔드 개발 경력 3년 이상을 보유하고 있는가?",
                        "result": False,
                    },
                    {
                        "content": "협업과 문제 해결 경험을 구체적으로 제시하고 있는가?",
                        "result": True,
                    },
                ],
                "competency_analysis": [
                    "컴퓨터공학 관련 학사 및 석사 학위를 취득하여 전문 지식 기반이 탄탄함",
                    "Java, Spring Boot, MySQL, Docker 등 다양한 백엔드 기술 스택 활용 가능",
                    "REST API 설계 및 연동 경험으로 서비스 개발 역량 보유",
                    "정보처리기사, AWS 자격증 취득으로 전문성 증명",
                    "프로젝트 일정 문제 발생 시 업무 재분배 및 우선순위 조정으로 문제 해결 능력 입증",
                ],
                "fit_analysis": [
                    "팀 내 원활한 커뮤니케이션과 협업 도구 활용 능력이 뛰어남",
                    "빠른 문제 해결과 책임감 있는 업무 자세로 조직 적응력 우수",
                    "프론트엔드 관련 요구사항은 충족하지 못해 직무 적합성에 일부 제한이 존재",
                ],
                "strength": [
                    "우수한 학력과 전문 자격을 통한 뛰어난 기술력",
                    "백엔드 개발 경험과 문제 해결 능력",
                    "협업 및 커뮤니케이션 능력이 우수하여 팀워크에 강점",
                    "글로벌 경험과 다양한 실무 경험으로 폭넓은 시각 보유",
                ],
                "concern": [
                    "프론트엔드 개발 경력 및 기술 보유 부족",
                    "서버 배포 및 인증/권한 관련 경험 미흡",
                    "SaaS 기반 업무 자동화 플랫폼 또는 AI 데이터 분석 기능 관련 경험 부재",
                ],
                "check_point": [
                    "프론트엔드 역량 강화 및 교육 추천",
                    "서버 운영 및 인증/권한 부문 경험 추가 검증 필요",
                    "향후 프로젝트에서 SaaS 도메인 및 AI 관련 업무 경험 기회 제공 여부 검토",
                ],
                "final_comment": (
                    "이수진 지원자는 백엔드 개발자로서 충분한 기술력과 문제 해결 역량을 갖추고 있으며, "
                    "협업과 책임감 면에서도 긍정적인 평가를 받습니다. 다만, 이번 포지션에 요구되는 "
                    "프론트엔드 역량과 일부 서비스 운영 경험에서 부족함이 있어, 해당 부분에 대한 보완 및 "
                    "추가 검증이 필요합니다. 기술 교육과 경험 확장 지원을 통해 역량을 보완한다면 팀에 "
                    "긍정적 기여가 가능할 것으로 판단되어 최종 등급은 B로 평가합니다."
                ),
            },
        )

        InterviewQuestion.objects.filter(resume=resume).delete()
        questions = [
            InterviewQuestion.objects.create(
                resume=resume,
                question="프론트엔드 개발 경력이 3년 이상은 아닌데, 부족한 경험을 어떻게 보완하고 빠르게 적응할 계획인가요?",
                answer=(
                    "저는 백엔드 개발자로서 2년 3개월간 Java와 Spring Boot를 활용한 ERP 시스템 API 개발 "
                    "경험이 있으며, 새로운 기술 학습에 적극적인 태도로 빠르게 습득해 왔습니다. 프론트엔드 "
                    "분야는 HTML, CSS, JavaScript 기본기를 집중적으로 독학하고 있으며, React와 Vue 등 "
                    "프레임워크도 단계적으로 학습할 계획입니다. 또한 오픈소스 프로젝트 기여 경험으로 협업과 "
                    "코드 리뷰를 통해 빠른 적응력을 입증했습니다."
                ),
                purpose="지원자의 프론트엔드 경력 부족을 어떻게 극복할지 학습 의지와 적응력 평가.",
            ),
            InterviewQuestion.objects.create(
                resume=resume,
                question="백엔드 중심의 경험을 프론트엔드 직무나 협업 과정에서 어떻게 활용할 수 있다고 생각하나요?",
                answer=(
                    "백엔드 API 구조와 데이터 흐름을 이해하고 있기 때문에 프론트엔드에서 필요한 API 명세와 "
                    "상태 관리 방식을 더 명확히 설계할 수 있습니다. 또한 서버와 클라이언트 사이의 병목이나 "
                    "오류 원인을 빠르게 파악해 협업 효율을 높일 수 있다고 생각합니다."
                ),
                purpose="지원자의 기존 경험이 지원 직무에 전이될 수 있는지 평가.",
            ),
            InterviewQuestion.objects.create(
                resume=resume,
                question="프로젝트 일정 문제가 발생했을 때 업무 재분배와 우선순위 조정을 어떻게 진행했나요?",
                answer=(
                    "먼저 지연 원인을 기능 단위로 분리하고, 반드시 필요한 핵심 기능과 후순위 기능을 구분했습니다. "
                    "이후 팀원별 역량과 진행 상황을 기준으로 업무를 재분배했고, 매일 짧은 점검 회의를 통해 "
                    "위험 요소를 조기에 공유했습니다."
                ),
                purpose="문제 해결 방식, 커뮤니케이션 능력, 책임감을 확인.",
            ),
        ]

        resume.status = Resume.STATUS_DONE
        resume.save(update_fields=["status", "updated_at"])

        return JsonResponse({
            "error": False,
            "data": {
                "report": report.to_dict(),
                "questions": [question.to_dict() for question in questions],
            },
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def report_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("resume_id")

        if not resume_id:
            return JsonResponse({"error": True, "message": "Resume id is required."}, status=400)

        if request.user.is_authenticated:
            resume_filter = Resume.objects.filter(id=resume_id, job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

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
        return JsonResponse({"error": True, "message": str(error)})


def report_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        report_id = data.get("id")

        if not report_id:
            return JsonResponse({"error": True, "message": "Report id is required."}, status=400)

        if "delete" in data:
            return JsonResponse({"error": True, "message": "Delete is not allowed."}, status=400)

        if request.user.is_authenticated:
            reports = AnalysisReport.objects.filter(resume__job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            reports = AnalysisReport.objects.filter(
                resume_id__in=auth_key.authorized_resume or [],
                resume__job_description__account=auth_key.account,
            )

        try:
            report = reports.get(id=report_id)
        except AnalysisReport.DoesNotExist:
            return JsonResponse({"error": True, "message": "Report does not exist."}, status=404)

        report_fields = _editable_model_fields(report, REPORT_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in REPORT_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

            if key not in report_fields:
                return JsonResponse({"error": True, "message": f"Invalid report field: {key}"}, status=400)

            setattr(report, key, value)

        report.save()

        return JsonResponse({"error": False, "data": report.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})


def question_get(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        resume_id = data.get("resume_id")

        if not resume_id:
            return JsonResponse({"error": True, "message": "Resume id is required."}, status=400)

        if request.user.is_authenticated:
            resume_filter = Resume.objects.filter(id=resume_id, job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

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
        return JsonResponse({"error": True, "message": str(error)})


def question_modify(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": True, "message": "POST request required."}, status=405)

        data = json.loads(request.body or "{}")
        question_id = data.get("id")

        if not question_id:
            return JsonResponse({"error": True, "message": "Question id is required."}, status=400)

        if "delete" in data:
            return JsonResponse({"error": True, "message": "Delete is not allowed."}, status=400)

        if request.user.is_authenticated:
            questions = InterviewQuestion.objects.filter(resume__job_description__account=request.user)
        else:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            try:
                auth_key = AuthKey.objects.select_related("account").get(value=api_key)
            except AuthKey.DoesNotExist:
                return JsonResponse({"error": True, "message": "User is not authenticated."})

            questions = InterviewQuestion.objects.filter(
                resume_id__in=auth_key.authorized_resume or [],
                resume__job_description__account=auth_key.account,
            )

        try:
            question = questions.get(id=question_id)
        except InterviewQuestion.DoesNotExist:
            return JsonResponse({"error": True, "message": "Question does not exist."}, status=404)

        question_fields = _editable_model_fields(question, QUESTION_BLOCKED_FIELDS)

        for key, value in data.items():
            if key in QUESTION_BLOCKED_FIELDS:
                if key == "id":
                    continue

                return JsonResponse({"error": True, "message": f"{key} cannot be modified."}, status=400)

            if key not in question_fields:
                return JsonResponse({"error": True, "message": f"Invalid question field: {key}"}, status=400)

            setattr(question, key, value)

        question.save()

        return JsonResponse({"error": False, "data": question.to_dict()})
    except Exception as error:
        return JsonResponse({"error": True, "message": str(error)})
