import json

from asgiref.sync import sync_to_async
from django.http import JsonResponse

from common import chat_graph
from common.jd_chat_graph import invoke as invoke_jd_chat_graph

from ..models import CompanyInfo, JobDescription
from .error_code import error_code
from .utils import accessible_job_descriptions, search_recruiting_data_dicts

JD_CHAT_JD_FIELDS = (
    "job_name",
    "education_level",
    "major",
    "career_level",
    "required_skill",
    "preferred_skill",
    "main_task",
    "hiring_reason",
    "work_type",
)

JD_CHAT_COMPANY_INFO_FIELDS = (
    "company_name",
    "employee_count",
    "team_composition",
    "company_description",
    "employ_style",
)


def _is_missing_field_value(value):
    if value is None:
        return True

    if isinstance(value, str):
        return not value.strip()

    return value == [] or value == {}


def _get_missing_jd_chat_fields(job_description, company_info):
    missing_fields = []

    for field_name in JD_CHAT_JD_FIELDS:
        if _is_missing_field_value(getattr(job_description, field_name)):
            missing_fields.append(field_name)

    for field_name in JD_CHAT_COMPANY_INFO_FIELDS:
        if _is_missing_field_value(getattr(company_info, field_name)):
            missing_fields.append(field_name)

    return missing_fields


def _apply_jd_chat_analyzed_fields(job_description, company_info, analyzed_fields):
    if not isinstance(analyzed_fields, dict):
        return {}

    applied_fields = {}
    job_description_updated = False
    company_info_updated = False

    for field_name, value in analyzed_fields.items():
        if field_name in JD_CHAT_JD_FIELDS:
            setattr(job_description, field_name, value)
            applied_fields[field_name] = value
            job_description_updated = True
        elif field_name in JD_CHAT_COMPANY_INFO_FIELDS:
            setattr(company_info, field_name, value)
            applied_fields[field_name] = value
            company_info_updated = True

    if job_description_updated:
        job_description.save()

    if company_info_updated:
        company_info.save()

    return applied_fields


def _next_jd_chat_state(graph_state):
    if not isinstance(graph_state, dict):
        return {
            "ignored_field": [],
            "focus_field": "",
            "end_chat": False,
        }

    return {
        "ignored_field": graph_state.get("ignored_field", []),
        "focus_field": graph_state.get("focus_field", ""),
        "end_chat": graph_state.get("end_chat", False),
    }


async def chat(request):
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

        try:
            await sync_to_async(lambda: accessible_job_descriptions(request).exists())()
        except PermissionError as error:
            return JsonResponse({"error": True, "message": error_code(str(error), 403)})

        async def search_recruiting_data(**kwargs):
            return await sync_to_async(search_recruiting_data_dicts)(
                request,
                masked=False,
                **kwargs,
            )

        response = await chat_graph.invoke({
            "chats": list(chats),
            "recruiting_data_searcher": search_recruiting_data,
        })

        return JsonResponse({
            "error": False,
            "response": {
                "role": "agent",
                "message": response,
            },
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)


def jd_chat(request):
    if request.method != "POST":
        return JsonResponse({"error": True, "message": error_code("POST request required.", 405)}, status=405)

    try:
        data = json.loads(request.body or "{}")
        jd_id = data.get("job_description_id")
        chats = data.get("chat")
        chat_state = data.get("state") or {}
        if not isinstance(chat_state, dict):
            chat_state = {}

        ignored_field = chat_state.get("ignored_field", data.get("ignored_field", []))
        focus_field = chat_state.get("focus_field", data.get("focus_field", ""))

        if not jd_id:
            return JsonResponse({"error": True, "message": error_code("JobDescription id is required.", 401)}, status=400)

        try:
            job_description_queryset = accessible_job_descriptions(request)
        except PermissionError:
            return JsonResponse({"error": True, "message": error_code("User is not authenticated.", 403)})

        try:
            job_description = job_description_queryset.select_related("account").get(id=jd_id)
        except JobDescription.DoesNotExist:
            return JsonResponse({"error": True, "message": error_code("JobDescription does not exist.", 400)}, status=400)

        if not isinstance(chats, list):
            return JsonResponse({"error": True, "message": error_code("Chat must be a list.", 400)}, status=400)

        for chat_item in chats:
            if not isinstance(chat_item, dict):
                return JsonResponse({"error": True, "message": error_code("Chat items must be objects.", 400)}, status=400)

            if chat_item.get("role") not in {"user", "agent"}:
                return JsonResponse({"error": True, "message": error_code("Chat role must be user or agent.", 400)}, status=400)

            if not isinstance(chat_item.get("message"), str):
                return JsonResponse({"error": True, "message": error_code("Chat message must be a string.", 400)}, status=400)

        company_info, _ = CompanyInfo.objects.get_or_create(account=job_description.account)
        missing_fields = _get_missing_jd_chat_fields(job_description, company_info)
        graph_result = invoke_jd_chat_graph(
            list(chats),
            missing_fields,
            comp_info=company_info.to_masked_dict(),
            jd=job_description.to_masked_dict(),
            ignored_field=ignored_field,
            focus_field=focus_field,
        )
        applied_fields = _apply_jd_chat_analyzed_fields(
            job_description,
            company_info,
            graph_result["state"].get("analyzed_field", {}),
        )
        graph_result["state"]["analyzed_field"] = applied_fields
        next_state = _next_jd_chat_state(graph_result.get("state", {}))

        return JsonResponse({
            "error": False,
            "response": {
                "role": "agent",
                "message": graph_result["response"],
            },
            "state": next_state,
        })
    except Exception as error:
        return JsonResponse({"error": True, "message": error_code(str(error), 500)}, status=500)
