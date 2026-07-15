import re

from django.db.models import Q

from ..models import AnalysisReport, AuthKey, CompanyInfo, JobDescription, Resume


def get_job_description_dicts(request, masked=False):
    serializer = "to_masked_dict" if masked else "to_dict"
    return [
        getattr(job_description, serializer)()
        for job_description in accessible_job_descriptions(request).order_by("id")
    ]


def _search_terms(*values):
    terms = []
    for value in values:
        if value is None:
            continue
        if isinstance(value, (list, tuple, set)):
            value = " ".join(str(item) for item in value)
        terms.extend(re.findall(r"[0-9A-Za-z가-힣+#.]+", str(value).lower()))
    return [term for term in terms if len(term) >= 2]


def _coerce_list(value):
    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        values = value
    else:
        values = re.split(r"[,\s]+", str(value))

    return [str(item).strip() for item in values if str(item).strip()]


def _or_icontains(fields, value):
    condition = Q()
    for term in _search_terms(value) or [str(value).strip()]:
        if not term:
            continue
        for field in fields:
            condition |= Q(**{f"{field}__icontains": term})
    return condition


JD_SEARCH_FIELDS = [
    "job_name",
    "education_level",
    "major",
    "career_level",
    "required_skill",
    "preferred_skill",
    "main_task",
    "hiring_reason",
    "work_type",
    "status",
]

RESUME_SEARCH_FIELDS = [
    "skill",
    "education_level",
    "experience",
    "self_intoduction",
    "certification",
    "language",
    "award",
    "training",
    "other_activity",
]

REPORT_SEARCH_FIELDS = [
    "version",
    "overall_grade",
    "overall_summary",
    "candidate_summary",
    "checklist",
    "competency_analysis",
    "fit_analysis",
    "motive",
    "collaboration",
    "strength",
    "concern",
    "check_point",
    "interview_question",
    "final_comment",
    "status",
]


def _get_request_account_and_authorized_resume_ids(request):
    if request.user.is_authenticated:
        return request.user, None

    api_key = request.headers.get("X-API-Key")

    if not api_key:
        raise PermissionError("User is not authenticated.")

    try:
        auth_key = AuthKey.objects.select_related("account").get(value=api_key)
    except AuthKey.DoesNotExist as exc:
        raise PermissionError("User is not authenticated.") from exc

    return auth_key.account, set(auth_key.authorized_resume or [])


def _serialize_job_description_for_chat(job_description, masked=False):
    serializer = "to_masked_dict" if masked else "to_dict"
    data = getattr(job_description, serializer)()

    if masked:
        data["status"] = _value_or_empty_string(job_description.status)

    return data


def _value_or_empty_string(value):
    return value if value is not None else ""


def _serialize_report_for_chat(report, masked=False):
    return report.to_dict()


def _normalize_filters(filters):
    return filters if isinstance(filters, dict) else {}


def _has_filters(filters):
    return any(value not in (None, "", [], {}, False) for value in filters.values())


def _should_search_table(filters, query):
    return bool(query) or bool(filters.get("get_all_list")) or _has_filters(filters)


def _apply_icontains_filters(queryset, filters, field_names):
    for field_name in field_names:
        value = filters.get(f"{field_name}_icontains")
        if value:
            queryset = queryset.filter(**{f"{field_name}__icontains": value})
    return queryset


def _apply_in_filter(queryset, filters, filter_name, field_name):
    values = _coerce_list(filters.get(filter_name))
    if values:
        queryset = queryset.filter(**{f"{field_name}__in": values})
    return queryset


def _accessible_resumes(request, authorized_resume_ids):
    if authorized_resume_ids is not None:
        return Resume.objects.filter(id__in=authorized_resume_ids)
    return Resume.objects.filter(job_description__account=request.user)


def _accessible_reports(request, authorized_resume_ids):
    queryset = AnalysisReport.objects.select_related("resume", "resume__job_description")
    if authorized_resume_ids is not None:
        return queryset.filter(resume_id__in=authorized_resume_ids)
    return queryset.filter(resume__job_description__account=request.user)


def _serialize_resume_for_chat(resume, masked=False):
    return resume.to_masked_dict() if masked else resume.to_dict()


def _result_item(object_type, data, **metadata):
    item = {
        "object_type": object_type,
        "data": data,
    }
    item.update({key: value for key, value in metadata.items() if value is not None})
    return item


def _company_info_result(company_info, masked=False):
    serializer = "to_masked_dict" if masked else "to_dict"
    return _result_item("company_info", getattr(company_info, serializer)())


def _search_job_descriptions(request, filters, query, limit, masked):
    queryset = accessible_job_descriptions(request)
    search_query = filters.get("query") or query

    if search_query:
        queryset = queryset.filter(_or_icontains(JD_SEARCH_FIELDS, search_query))

    queryset = _apply_icontains_filters(queryset, filters, JD_SEARCH_FIELDS)
    queryset = _apply_in_filter(queryset, filters, "id_in", "id")
    queryset = _apply_in_filter(queryset, filters, "status_in", "status")
    queryset = _apply_in_filter(queryset, filters, "work_type_in", "work_type")

    return [
        _result_item(
            "job_description",
            _serialize_job_description_for_chat(job_description, masked=masked),
        )
        for job_description in queryset.distinct().order_by("id")[:limit]
    ]


def _search_resumes(request, authorized_resume_ids, filters, query, limit, masked):
    queryset = _accessible_resumes(request, authorized_resume_ids).select_related("job_description")
    search_query = filters.get("query") or query

    if search_query:
        queryset = queryset.filter(_or_icontains(RESUME_SEARCH_FIELDS, search_query))

    queryset = _apply_icontains_filters(queryset, filters, RESUME_SEARCH_FIELDS)
    queryset = _apply_in_filter(queryset, filters, "id_in", "id")
    queryset = _apply_in_filter(queryset, filters, "job_description_id_in", "job_description_id")
    reviewed_values = filters.get("reviewed_in")
    if isinstance(reviewed_values, list) and reviewed_values:
        queryset = queryset.filter(reviewed__in=reviewed_values)

    return [
        _result_item(
            "resume",
            _serialize_resume_for_chat(resume, masked=masked),
            job_description=_serialize_job_description_for_chat(
                resume.job_description,
                masked=masked,
            ) if resume.job_description else None,
        )
        for resume in queryset.distinct().order_by("id")[:limit]
    ]


def _search_analysis_reports(request, authorized_resume_ids, filters, query, limit, masked):
    queryset = _accessible_reports(request, authorized_resume_ids)
    search_query = filters.get("query") or query

    if search_query:
        queryset = queryset.filter(_or_icontains(REPORT_SEARCH_FIELDS, search_query))

    queryset = _apply_icontains_filters(queryset, filters, REPORT_SEARCH_FIELDS)
    queryset = _apply_in_filter(queryset, filters, "id_in", "id")
    queryset = _apply_in_filter(queryset, filters, "resume_id_in", "resume_id")
    queryset = _apply_in_filter(queryset, filters, "overall_grade_in", "overall_grade")
    queryset = _apply_in_filter(queryset, filters, "status_in", "status")

    return [
        _result_item(
            "analysis_report",
            _serialize_report_for_chat(report, masked=masked),
            resume=_serialize_resume_for_chat(report.resume, masked=masked),
            job_description=_serialize_job_description_for_chat(
                report.resume.job_description,
                masked=masked,
            ) if report.resume and report.resume.job_description else None,
        )
        for report in queryset.distinct().order_by("id")[:limit]
    ]


def search_recruiting_data_dicts(
    request,
    query="",
    jd_filters=None,
    resume_filters=None,
    report_filters=None,
    limit=10,
    masked=False,
):
    try:
        limit = int(limit or 10)
    except (TypeError, ValueError):
        limit = 10
    limit = max(1, min(limit, 50))

    account, authorized_resume_ids = _get_request_account_and_authorized_resume_ids(request)
    company_info, _ = CompanyInfo.objects.get_or_create(account=account)

    jd_filters = _normalize_filters(jd_filters)
    resume_filters = _normalize_filters(resume_filters)
    report_filters = _normalize_filters(report_filters)

    search_all = bool(query) and not any(
        _has_filters(filters)
        for filters in (jd_filters, resume_filters, report_filters)
    )
    results = [_company_info_result(company_info, masked=masked)]

    if search_all or _should_search_table(jd_filters, ""):
        results.extend(_search_job_descriptions(request, jd_filters, query, limit, masked))

    if search_all or _should_search_table(resume_filters, ""):
        results.extend(_search_resumes(request, authorized_resume_ids, resume_filters, query, limit, masked))

    if search_all or _should_search_table(report_filters, ""):
        results.extend(_search_analysis_reports(request, authorized_resume_ids, report_filters, query, limit, masked))

    return results


def search_job_description_dicts(request, **kwargs):
    return [
        item["data"]
        for item in search_recruiting_data_dicts(request, **kwargs)
        if item.get("object_type") == "job_description"
    ]


def accessible_job_descriptions(request):
    if request.user.is_authenticated:
        return JobDescription.objects.filter(account=request.user)

    api_key = request.headers.get("X-API-Key")

    if not api_key:
        raise PermissionError("User is not authenticated.")

    try:
        auth_key = AuthKey.objects.select_related("account").get(value=api_key)
    except AuthKey.DoesNotExist as exc:
        raise PermissionError("User is not authenticated.") from exc

    authorized_resume = auth_key.authorized_resume or []
    return JobDescription.objects.filter(
        account=auth_key.account,
        resumes__id__in=authorized_resume,
    ).distinct()


def editable_model_fields(instance, blocked_fields):
    return {
        field.name
        for field in instance._meta.fields
        if field.name not in blocked_fields
    }
