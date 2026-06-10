from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.


def _datetime_to_iso(value):
    return value.isoformat() if value else None


class Account(AbstractUser):
    # id, username, password는 AbstractUser 컬럼 사용

    name = models.CharField(max_length=100)

    verification_question = models.CharField(max_length=255, null=True, blank=True)
    verification_answer = models.CharField(max_length=255, null=True, blank=True)
    credit = models.IntegerField(default=150)
    subscribe = models.BooleanField(default=False)
    subscribe_expiration = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.username

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "password": self.password,
            "name": self.name,
            "verification_question": self.verification_question,
            "verification_answer": self.verification_answer,
            "credit": self.credit,
            "subscribe": self.subscribe,
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
            "account_id": self.account_id,
            "company_name": self.company_name,
            "employee_count": self.employee_count,
            "team_composition": self.team_composition,
            "company_description": self.company_description,
            "employ_style": self.employ_style,
        }


class AuthKey(models.Model):
    id = models.BigAutoField(primary_key=True)

    account = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="account_id",
        related_name="auth_keys",
    )

    description = models.CharField(max_length=255, null=True, blank=True)
    value = models.TextField()
    authorized_resume = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "auth_keys"

    def __str__(self):
        return self.description or f"AuthKey {self.id}"

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "description": self.description,
            "value": self.value,
            "authorized_resume": self.authorized_resume,
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_descriptions"

    def __str__(self):
        return self.job_name

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "job_name": self.job_name,
            "education_level": self.education_level,
            "major": self.major,
            "career_level": self.career_level,
            "required_skill": self.required_skill,
            "preferred_skill": self.preferred_skill,
            "main_task": self.main_task,
            "hiring_reason": self.hiring_reason,
            "work_type": self.work_type,
            "status": self.status,
            "created_at": _datetime_to_iso(self.created_at),
            "updated_at": _datetime_to_iso(self.updated_at),
        }


class Resume(models.Model):
    STATUS_ONQUEUE = "onqueue"
    STATUS_PROCESSING = "processing"
    STATUS_DONE = "done"
    STATUS_CHOICES = [
        (STATUS_ONQUEUE, "On queue"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_DONE, "Done"),
    ]

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

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_ONQUEUE,
    )
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
            "job_description_id": self.job_description_id,
            "name": self.name,
            "skill": self.skill,
            "education_level": self.education_level,
            "experience": self.experience,
            "self_intoduction": self.self_intoduction,
            "certification": self.certification,
            "language": self.language,
            "award": self.award,
            "training": self.training,
            "other_activity": self.other_activity,
            "status": self.status,
            "reviewed": self.reviewed,
            "reviewed_at": _datetime_to_iso(self.reviewed_at),
            "created_at": _datetime_to_iso(self.created_at),
            "updated_at": _datetime_to_iso(self.updated_at),
        }


class AnalysisReport(models.Model):
    id = models.BigAutoField(primary_key=True)

    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        db_column="resume_id",
        related_name="analysis_report",
    )

    overall_grade = models.CharField(max_length=10)
    overall_summary = models.TextField(null=True, blank=True)
    candidate_summary = models.TextField(null=True, blank=True)

    checklist = models.JSONField(null=True, blank=True)
    competency_analysis = models.JSONField(null=True, blank=True)
    fit_analysis = models.JSONField(null=True, blank=True)
    strength = models.JSONField(null=True, blank=True)
    concern = models.JSONField(null=True, blank=True)
    check_point = models.JSONField(null=True, blank=True)

    final_comment = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "analysis_reports"

    def __str__(self):
        return f"AnalysisReport {self.id} - {self.overall_grade}"

    def to_dict(self):
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "overall_grade": self.overall_grade,
            "overall_summary": self.overall_summary,
            "candidate_summary": self.candidate_summary,
            "checklist": self.checklist,
            "competency_analysis": self.competency_analysis,
            "fit_analysis": self.fit_analysis,
            "strength": self.strength,
            "concern": self.concern,
            "check_point": self.check_point,
            "final_comment": self.final_comment,
        }


class InterviewQuestion(models.Model):
    id = models.BigAutoField(primary_key=True)

    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        db_column="resume_id",
        related_name="interview_questions",
    )

    question = models.TextField()
    answer = models.TextField(null=True, blank=True)
    purpose = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "interview_questions"

    def __str__(self):
        return self.question[:50]

    def to_dict(self):
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "question": self.question,
            "answer": self.answer,
            "purpose": self.purpose,
        }
