import secrets

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.


def _datetime_to_iso(value):
    return value.isoformat() if value else ""


def _value_or_empty_string(value):
    return value if value is not None else ""


def _value_or_empty_list(value):
    return value if value is not None else []


def _value_or_empty_dict(value):
    return value if value is not None else {}


def _value_or_empty_text(value):
    if value is None:
        return ""

    if isinstance(value, list):
        return "\n".join(str(item) for item in value if item)

    return str(value)


def _value_or_zero(value):
    return value if value is not None else 0


def _value_or_false(value):
    return value if value is not None else False


def generate_account_hash():
    return secrets.token_urlsafe(16)[:16]


def generate_auth_key_value(account_hash):
    prefix = f"sk_live_{account_hash}"
    return prefix + secrets.token_urlsafe(48)[:48 - len(prefix)]


class Account(AbstractUser):
    # id, username, password는 AbstractUser 컬럼 사용

    name = models.CharField(max_length=100)

    verification_question = models.CharField(max_length=255, null=True, blank=True)
    verification_answer = models.CharField(max_length=255, null=True, blank=True)
    credit = models.IntegerField(default=100)
    subscribe = models.BooleanField(default=False)
    subscribe_expiration = models.DateTimeField(null=True, blank=True)
    account_hash = models.CharField(max_length=16, unique=True, default=generate_account_hash)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if not self.account_hash:
            self.account_hash = generate_account_hash()

        while Account.objects.filter(account_hash=self.account_hash).exclude(pk=self.pk).exists():
            self.account_hash = generate_account_hash()

        super().save(*args, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "account_hash": _value_or_empty_string(self.account_hash),
            "name": _value_or_empty_string(self.name),
            "verification_question": _value_or_empty_string(self.verification_question),
            "verification_answer": _value_or_empty_string(self.verification_answer),
            "credit": _value_or_zero(self.credit),
            "subscribe": _value_or_false(self.subscribe),
            "subscribe_expiration": _datetime_to_iso(self.subscribe_expiration),
        }


class CompanyInfo(models.Model):
    id = models.BigAutoField(primary_key=True)

    account = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="account_id",
        related_name="company_info",
    )

    company_name = models.CharField(max_length=100, default="", blank=True)
    employee_count = models.IntegerField(null=True, blank=True)
    team_composition = models.JSONField(default=list, blank=True)
    company_description = models.TextField(default="", blank=True)
    employ_style = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "company_info"

    def __str__(self):
        return self.company_name or f"CompanyInfo {self.id}"

    def to_dict(self):
        return {
            "id": self.id,
            "company_name": _value_or_empty_string(self.company_name),
            "employee_count": _value_or_zero(self.employee_count),
            "team_composition": _value_or_empty_list(self.team_composition),
            "company_description": _value_or_empty_string(self.company_description),
            "employ_style": _value_or_empty_list(self.employ_style),
        }

    def to_masked_dict(self):
        return {
            "employee_count": _value_or_zero(self.employee_count),
            "team_composition": _value_or_empty_list(self.team_composition),
            "company_description": _value_or_empty_string(self.company_description),
            "employ_style": _value_or_empty_list(self.employ_style),
        }


class AuthKey(models.Model):
    id = models.BigAutoField(primary_key=True)

    account = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="account_id",
        related_name="auth_keys",
    )

    name = models.CharField(max_length=100, default="", blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    credit_limit = models.IntegerField(default=0)
    value = models.CharField(max_length=48, unique=True)
    authorized_resume = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "auth_keys"

    def __str__(self):
        return self.name or self.description or f"AuthKey {self.id}"

    def save(self, *args, **kwargs):
        if not self.value and self.account_id:
            self.value = generate_auth_key_value(self.account.account_hash)

        while AuthKey.objects.filter(value=self.value).exclude(pk=self.pk).exists():
            self.value = generate_auth_key_value(self.account.account_hash)

        super().save(*args, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "name": _value_or_empty_string(self.name),
            "description": _value_or_empty_string(self.description),
            "credit_limit": _value_or_zero(self.credit_limit),
            "value": _value_or_empty_string(self.value),
            "authorized_resume": _value_or_empty_list(self.authorized_resume),
        }


class JobDescription(models.Model):
    STATUS_PREPARE = "prepare"
    STATUS_ON_GOING = "on_going"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_PREPARE, "Prepare"),
        (STATUS_ON_GOING, "On going"),
        (STATUS_CLOSED, "Closed"),
    ]
    CHECKLIST_STATUS_ONQUEUE = "onqueue"
    CHECKLIST_STATUS_PROCESSING = "processing"
    CHECKLIST_STATUS_DONE = "done"
    CHECKLIST_STATUS_FAIL = "fail"
    CHECKLIST_STATUS_CHOICES = [
        (CHECKLIST_STATUS_ONQUEUE, "On queue"),
        (CHECKLIST_STATUS_PROCESSING, "Processing"),
        (CHECKLIST_STATUS_DONE, "Done"),
        (CHECKLIST_STATUS_FAIL, "Fail"),
    ]

    id = models.BigAutoField(primary_key=True)

    account = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="account_id",
        related_name="job_descriptions",
    )

    job_name = models.CharField(max_length=100)
    education_level = models.CharField(max_length=30, null=True, blank=True)
    major = models.CharField(max_length=30, null=True, blank=True)
    career_level = models.CharField(max_length=50)

    required_skill = models.JSONField()
    preferred_skill = models.JSONField(null=True, blank=True)

    main_task = models.TextField(null=True, blank=True)
    hiring_reason = models.TextField(null=True, blank=True)

    work_type = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_PREPARE,
    )
    checklist_status = models.CharField(
        max_length=30,
        choices=CHECKLIST_STATUS_CHOICES,
        default=CHECKLIST_STATUS_DONE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_descriptions"

    def __str__(self):
        return self.job_name

    def to_dict(self):
        return {
            "id": self.id,
            "job_name": _value_or_empty_string(self.job_name),
            "education_level": _value_or_empty_string(self.education_level),
            "major": _value_or_empty_string(self.major),
            "career_level": _value_or_empty_string(self.career_level),
            "required_skill": _value_or_empty_list(self.required_skill),
            "preferred_skill": _value_or_empty_list(self.preferred_skill),
            "main_task": _value_or_empty_string(self.main_task),
            "hiring_reason": _value_or_empty_string(self.hiring_reason),
            "work_type": _value_or_empty_string(self.work_type),
            "status": _value_or_empty_string(self.status),
            "checklist_status": _value_or_empty_string(self.checklist_status),
            "created_at": _datetime_to_iso(self.created_at),
            "updated_at": _datetime_to_iso(self.updated_at),
        }

    def to_masked_dict(self):
        return {
            "job_name": _value_or_empty_string(self.job_name),
            "education_level": _value_or_empty_string(self.education_level),
            "major": _value_or_empty_string(self.major),
            "career_level": _value_or_empty_string(self.career_level),
            "required_skill": _value_or_empty_list(self.required_skill),
            "preferred_skill": _value_or_empty_list(self.preferred_skill),
            "main_task": _value_or_empty_string(self.main_task),
            "hiring_reason": _value_or_empty_string(self.hiring_reason),
            "work_type": _value_or_empty_string(self.work_type)
        }


class Checklist(models.Model):
    id = models.BigAutoField(primary_key=True)

    job_description = models.ForeignKey(
        JobDescription,
        on_delete=models.CASCADE,
        db_column="job_description_id",
        related_name="checklists",
    )

    content = models.TextField()

    class Meta:
        db_table = "checklists"

    def __str__(self):
        return self.content[:50]

    def to_dict(self):
        return {
            "id": self.id,
            "job_description_id": self.job_description_id,
            "content": _value_or_empty_string(self.content),
        }


class Resume(models.Model):
    id = models.BigAutoField(primary_key=True)

    job_description = models.ForeignKey(
        JobDescription,
        on_delete=models.CASCADE,
        db_column="job_description_id",
        related_name="resumes",
        null=True,
        blank=True,
    )

    name = models.CharField(max_length=100, null=True, blank=True)
    skill = models.JSONField(null=True, blank=True)
    education_level = models.JSONField(null=True, blank=True)
    experience = models.JSONField(null=True, blank=True)
    self_intoduction = models.JSONField(null=True, blank=True)
    certification = models.JSONField(null=True, blank=True)
    language = models.JSONField(null=True, blank=True)
    award = models.JSONField(null=True, blank=True)
    training = models.JSONField(null=True, blank=True)
    other_activity = models.JSONField(null=True, blank=True)

    reviewed = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resumes"

    def __str__(self):
        return self.name or f"Resume {self.id}"

    def to_dict(self):
        return {
            "id": self.id,
            "job_description_id": _value_or_zero(self.job_description_id),
            "name": _value_or_empty_string(self.name),
            "skill": _value_or_empty_list(self.skill),
            "education_level": _value_or_empty_dict(self.education_level),
            "experience": _value_or_empty_list(self.experience),
            "self_intoduction": _value_or_empty_list(self.self_intoduction),
            "certification": _value_or_empty_list(self.certification),
            "language": _value_or_empty_list(self.language),
            "award": _value_or_empty_list(self.award),
            "training": _value_or_empty_list(self.training),
            "other_activity": _value_or_empty_list(self.other_activity),
            "reviewed": _value_or_false(self.reviewed),
            "reviewed_at": _datetime_to_iso(self.reviewed_at),
            "created_at": _datetime_to_iso(self.created_at),
            "updated_at": _datetime_to_iso(self.updated_at),
        }

    def to_masked_dict(self):
        return {
            "skill": _value_or_empty_list(self.skill),
            "education_level": _value_or_empty_dict(self.education_level),
            "experience": _value_or_empty_list(self.experience),
            "self_intoduction": _value_or_empty_list(self.self_intoduction),
            "certification": _value_or_empty_list(self.certification),
            "language": _value_or_empty_list(self.language),
            "award": _value_or_empty_list(self.award),
            "training": _value_or_empty_list(self.training),
            "other_activity": _value_or_empty_list(self.other_activity)
        }


class AnalysisReport(models.Model):
    STATUS_ONQUEUE = "onqueue"
    STATUS_PROCESSING = "processing"
    STATUS_DONE = "done"
    STATUS_FAIL = "fail"
    STATUS_CHOICES = [
        (STATUS_ONQUEUE, "On queue"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_DONE, "Done"),
        (STATUS_FAIL, "Fail"),
    ]

    id = models.BigAutoField(primary_key=True)
    version = models.CharField(max_length=100, default="", blank=True)
    user_feedback = models.IntegerField(default=-1)
    review_text = models.TextField(null=True, blank=True)

    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        db_column="resume_id",
        related_name="analysis_reports",
    )

    overall_grade = models.CharField(max_length=10)
    overall_summary = models.TextField(null=True, blank=True)
    candidate_summary = models.TextField(null=True, blank=True)

    checklist = models.JSONField(null=True, blank=True)
    competency_analysis = models.JSONField(null=True, blank=True)
    fit_analysis = models.TextField(default="", blank=True)
    motive = models.TextField(default="", blank=True)
    collaboration = models.TextField(default="", blank=True)
    strength = models.JSONField(null=True, blank=True)
    concern = models.JSONField(null=True, blank=True)
    check_point = models.JSONField(null=True, blank=True)
    interview_question = models.JSONField(default=list, blank=True)

    final_comment = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_ONQUEUE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "analysis_reports"

    def __str__(self):
        return f"AnalysisReport {self.id} - {self.overall_grade}"

    def to_dict(self):
        return {
            "id": self.id,
            "version": _value_or_empty_string(self.version),
            "user_feedback": self.user_feedback,
            "review_text": _value_or_empty_string(self.review_text),
            "resume_id": self.resume_id,
            "overall_grade": _value_or_empty_string(self.overall_grade),
            "overall_summary": _value_or_empty_string(self.overall_summary),
            "candidate_summary": _value_or_empty_string(self.candidate_summary),
            "checklist": _value_or_empty_list(self.checklist),
            "competency_analysis": _value_or_empty_list(self.competency_analysis),
            "fit_analysis": _value_or_empty_text(self.fit_analysis),
            "motive": _value_or_empty_text(self.motive),
            "collaboration": _value_or_empty_text(self.collaboration),
            "strength": _value_or_empty_list(self.strength),
            "concern": _value_or_empty_list(self.concern),
            "check_point": _value_or_empty_list(self.check_point),
            "interview_question": self.get_interview_question(),
            "final_comment": _value_or_empty_string(self.final_comment),
            "status": _value_or_empty_string(self.status),
            "created_at": _datetime_to_iso(self.created_at),
        }

    def get_interview_question(self):
        questions = self.interview_question or []
        return [
            {
                "question": _value_or_empty_string(item.get("question")),
                "answer": _value_or_empty_string(item.get("answer")),
                "purpose": _value_or_empty_string(item.get("purpose")),
            }
            for item in questions
            if isinstance(item, dict)
        ]
