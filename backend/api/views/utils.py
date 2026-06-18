from ..models import AuthKey, JobDescription


def get_job_description_dicts(request):
    return [job_description.to_dict() for job_description in accessible_job_descriptions(request).order_by("id")]


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
