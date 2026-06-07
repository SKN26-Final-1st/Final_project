from django.db import models

# Create your models here.


class Block(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    cnt = models.IntegerField()

    class Meta:
        db_table = "block"

    def __str__(self):
        return self.name


class Account(models.Model):
    id = models.BigAutoField(primary_key=True)

    email = models.EmailField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    name = models.CharField(max_length=100)

    verification_question = models.CharField(max_length=255, null=True, blank=True)
    verification_answer_hash = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email


class CompanyInfo(models.Model):
    id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="company_infos",
    )

    company_name = models.CharField(max_length=100, null=True, blank=True)
    employee_count = models.IntegerField(null=True, blank=True)
    team_composition = models.TextField(null=True, blank=True)
    company_description = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_info"

    def __str__(self):
        return self.company_name or f"CompanyInfo {self.id}"


class JobPost(models.Model):
    id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="job_posts",
    )

    company_info = models.ForeignKey(
        CompanyInfo,
        on_delete=models.SET_NULL,
        db_column="company_info_id",
        related_name="job_posts",
        null=True,
        blank=True,
    )

    job_title = models.CharField(max_length=100)
    education_level = models.CharField(max_length=30, null=True, blank=True)
    major = models.CharField(max_length=30, null=True, blank=True)
    career_level = models.CharField(max_length=50)

    required_skills = models.JSONField()
    preferred_skills = models.JSONField(null=True, blank=True)

    main_tasks = models.TextField(null=True, blank=True)
    hiring_reason = models.TextField(null=True, blank=True)

    work_type = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=30, default="open")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_posts"

    def __str__(self):
        return self.job_title


class Applicant(models.Model):
    id = models.BigAutoField(primary_key=True)

    job_post = models.ForeignKey(
        JobPost,
        on_delete=models.CASCADE,
        db_column="job_post_id",
        related_name="applicants",
    )

    candidate_name = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)

    portfolio_url = models.URLField(max_length=500, null=True, blank=True)
    github_url = models.URLField(max_length=500, null=True, blank=True)

    memo = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "applicants"

    def __str__(self):
        return self.candidate_name or f"Applicant {self.id}"


class Resume(models.Model):
    id = models.BigAutoField(primary_key=True)

    applicant = models.ForeignKey(
        Applicant,
        on_delete=models.CASCADE,
        db_column="applicant_id",
        related_name="resumes",
    )

    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, null=True, blank=True)
    file_type = models.CharField(max_length=50)

    raw_text = models.TextField(null=True, blank=True)
    masked_text = models.TextField(null=True, blank=True)

    parse_status = models.CharField(max_length=30, default="pending")
    error_message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resumes"

    def __str__(self):
        return self.file_name


class AnalysisReport(models.Model):
    id = models.BigAutoField(primary_key=True)

    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        db_column="resume_id",
        related_name="analysis_reports",
    )

    job_post = models.ForeignKey(
        JobPost,
        on_delete=models.CASCADE,
        db_column="job_post_id",
        related_name="analysis_reports",
    )

    overall_grade = models.CharField(max_length=10)
    overall_summary = models.TextField(null=True, blank=True)
    candidate_summary = models.TextField(null=True, blank=True)

    competency_analysis = models.JSONField(null=True, blank=True)
    fit_analysis = models.JSONField(null=True, blank=True)
    strengths = models.JSONField(null=True, blank=True)
    concerns = models.JSONField(null=True, blank=True)
    check_points = models.JSONField(null=True, blank=True)

    final_comment = models.TextField(null=True, blank=True)

    judge_status = models.CharField(
        max_length=30,
        null=True,
        blank=True,
        default="not_checked",
    )

    status = models.CharField(max_length=30, default="draft")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analysis_reports"

    def __str__(self):
        return f"AnalysisReport {self.id} - {self.overall_grade}"


class InterviewQuestion(models.Model):
    id = models.BigAutoField(primary_key=True)

    analysis_report = models.ForeignKey(
        AnalysisReport,
        on_delete=models.CASCADE,
        db_column="analysis_report_id",
        related_name="interview_questions",
    )

    category = models.CharField(max_length=50)
    question = models.TextField()

    purpose = models.TextField(null=True, blank=True)
    evaluation_point = models.TextField(null=True, blank=True)
    related_evidence = models.TextField(null=True, blank=True)

    difficulty = models.CharField(max_length=30, null=True, blank=True)
    priority = models.CharField(max_length=30, null=True, blank=True)
    sort_order = models.IntegerField(null=True, blank=True)

    interviewer_memo = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interview_questions"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.question[:50]
