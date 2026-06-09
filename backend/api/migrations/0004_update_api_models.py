import json

import django.db.models.deletion
from django.db import migrations, models


def prepare_team_composition_json(apps, schema_editor):
    CompanyInfo = apps.get_model("api", "CompanyInfo")

    for company_info in CompanyInfo.objects.exclude(team_composition__isnull=True):
        value = company_info.team_composition

        if value == "":
            company_info.team_composition = None
        else:
            try:
                parsed_value = json.loads(value)
            except (TypeError, ValueError):
                parsed_value = [value]

            if not isinstance(parsed_value, list):
                parsed_value = [parsed_value]

            company_info.team_composition = json.dumps(parsed_value, ensure_ascii=False)

        company_info.save(update_fields=["team_composition"])


def copy_applicant_data_to_resume(apps, schema_editor):
    Resume = apps.get_model("api", "Resume")

    for resume in Resume.objects.select_related("applicant").all():
        if not resume.applicant_id:
            continue

        resume.name = resume.applicant.candidate_name
        resume.job_description_id = resume.applicant.job_post_id
        resume.save(update_fields=["name", "job_description"])


def ensure_one_report_per_resume(apps, schema_editor):
    AnalysisReport = apps.get_model("api", "AnalysisReport")
    duplicate_resume_ids = (
        AnalysisReport.objects.values("resume_id")
        .annotate(report_count=models.Count("id"))
        .filter(report_count__gt=1)
        .values_list("resume_id", flat=True)
    )

    duplicate_resume_ids = list(duplicate_resume_ids)
    if duplicate_resume_ids:
        raise ValueError(
            "Cannot convert AnalysisReport.resume to OneToOneField because "
            f"these resume IDs have multiple reports: {duplicate_resume_ids}"
        )


def copy_report_resume_to_question(apps, schema_editor):
    InterviewQuestion = apps.get_model("api", "InterviewQuestion")

    for interview_question in InterviewQuestion.objects.select_related("analysis_report").all():
        if interview_question.analysis_report_id and interview_question.analysis_report:
            interview_question.resume_id = interview_question.analysis_report.resume_id
            interview_question.save(update_fields=["resume_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_account_abstract_user_and_companyinfo_onetoone"),
    ]

    operations = [
        migrations.RenameField(
            model_name="account",
            old_name="verification_answer_hash",
            new_name="verification_answer",
        ),
        migrations.AddField(
            model_name="account",
            name="credit",
            field=models.IntegerField(default=150),
        ),
        migrations.RemoveField(
            model_name="account",
            name="created_at",
        ),
        migrations.RemoveField(
            model_name="account",
            name="updated_at",
        ),
        migrations.RenameField(
            model_name="companyinfo",
            old_name="user",
            new_name="account",
        ),
        migrations.AlterField(
            model_name="companyinfo",
            name="account",
            field=models.OneToOneField(
                db_column="account_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="company_info",
                to="api.account",
            ),
        ),
        migrations.RunPython(
            prepare_team_composition_json,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="companyinfo",
            name="team_composition",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="companyinfo",
            name="employ_style",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.RemoveField(
            model_name="companyinfo",
            name="created_at",
        ),
        migrations.RemoveField(
            model_name="companyinfo",
            name="updated_at",
        ),
        migrations.CreateModel(
            name="AuthKey",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("description", models.CharField(blank=True, max_length=255, null=True)),
                ("value", models.TextField()),
                ("authorized_resume", models.JSONField(blank=True, null=True)),
                (
                    "account",
                    models.ForeignKey(
                        db_column="account_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="auth_keys",
                        to="api.account",
                    ),
                ),
            ],
            options={
                "db_table": "auth_keys",
            },
        ),
        migrations.RenameModel(
            old_name="JobPost",
            new_name="JobDescription",
        ),
        migrations.RenameField(
            model_name="jobdescription",
            old_name="user",
            new_name="account",
        ),
        migrations.AlterField(
            model_name="jobdescription",
            name="account",
            field=models.ForeignKey(
                db_column="account_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="job_descriptions",
                to="api.account",
            ),
        ),
        migrations.RenameField(
            model_name="jobdescription",
            old_name="job_title",
            new_name="job_name",
        ),
        migrations.RenameField(
            model_name="jobdescription",
            old_name="required_skills",
            new_name="required_skill",
        ),
        migrations.RenameField(
            model_name="jobdescription",
            old_name="preferred_skills",
            new_name="preferred_skill",
        ),
        migrations.RenameField(
            model_name="jobdescription",
            old_name="main_tasks",
            new_name="main_task",
        ),
        migrations.RemoveField(
            model_name="jobdescription",
            name="company_info",
        ),
        migrations.AlterField(
            model_name="jobdescription",
            name="status",
            field=models.CharField(
                choices=[
                    ("prepare", "Prepare"),
                    ("on_going", "On going"),
                    ("closed", "Closed"),
                ],
                default="prepare",
                max_length=30,
            ),
        ),
        migrations.AlterModelTable(
            name="jobdescription",
            table="job_descriptions",
        ),
        migrations.AddField(
            model_name="resume",
            name="job_description",
            field=models.ForeignKey(
                blank=True,
                db_column="job_description_id",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="resumes",
                to="api.jobdescription",
            ),
        ),
        migrations.AddField(
            model_name="resume",
            name="name",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="skill",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="education_level",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="experience",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="self_intoduction",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="certification",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="language",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="award",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="training",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="other_activity",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resume",
            name="status",
            field=models.CharField(
                choices=[
                    ("onqueue", "On queue"),
                    ("processing", "Processing"),
                    ("done", "Done"),
                ],
                default="onqueue",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="resume",
            name="reviewed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="resume",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(
            copy_applicant_data_to_resume,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="resume",
            name="applicant",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="file_name",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="file_path",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="file_type",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="raw_text",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="masked_text",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="parse_status",
        ),
        migrations.RemoveField(
            model_name="resume",
            name="error_message",
        ),
        migrations.DeleteModel(
            name="Applicant",
        ),
        migrations.RemoveField(
            model_name="analysisreport",
            name="job_post",
        ),
        migrations.AddField(
            model_name="analysisreport",
            name="checklist",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.RenameField(
            model_name="analysisreport",
            old_name="strengths",
            new_name="strength",
        ),
        migrations.RenameField(
            model_name="analysisreport",
            old_name="concerns",
            new_name="concern",
        ),
        migrations.RenameField(
            model_name="analysisreport",
            old_name="check_points",
            new_name="check_point",
        ),
        migrations.RemoveField(
            model_name="analysisreport",
            name="judge_status",
        ),
        migrations.RemoveField(
            model_name="analysisreport",
            name="status",
        ),
        migrations.RemoveField(
            model_name="analysisreport",
            name="created_at",
        ),
        migrations.RemoveField(
            model_name="analysisreport",
            name="updated_at",
        ),
        migrations.RunPython(
            ensure_one_report_per_resume,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="analysisreport",
            name="resume",
            field=models.OneToOneField(
                db_column="resume_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="analysis_report",
                to="api.resume",
            ),
        ),
        migrations.AddField(
            model_name="interviewquestion",
            name="resume",
            field=models.ForeignKey(
                blank=True,
                db_column="resume_id",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="interview_questions",
                to="api.resume",
            ),
        ),
        migrations.RunPython(
            copy_report_resume_to_question,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="interviewquestion",
            name="resume",
            field=models.ForeignKey(
                db_column="resume_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="interview_questions",
                to="api.resume",
            ),
        ),
        migrations.AddField(
            model_name="interviewquestion",
            name="answer",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="analysis_report",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="category",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="evaluation_point",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="related_evidence",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="difficulty",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="priority",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="sort_order",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="interviewer_memo",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="created_at",
        ),
        migrations.RemoveField(
            model_name="interviewquestion",
            name="updated_at",
        ),
        migrations.AlterModelOptions(
            name="interviewquestion",
            options={},
        ),
    ]
