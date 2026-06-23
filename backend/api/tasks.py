from celery import shared_task
from celery import current_app
from django.conf import settings
from django.db import transaction

from common import report as report_service

from .models import AnalysisReport, CompanyInfo

_CELERY_WORKER_AVAILABLE = None


def _build_interview_question(report_data):
    question_items = report_data.get("question") or []
    return [
        {
            "question": item.get("question", ""),
            "answer": item.get("answer", ""),
            "purpose": item.get("purpose", ""),
        }
        for item in question_items
        if item.get("question")
    ]


def _apply_analysis_result(report, report_data):
    report.overall_grade = report_data.get("overall_grade", "")
    report.overall_summary = report_data.get("overall_summary", "")
    report.candidate_summary = report_data.get("candidate_summary", "")
    report.checklist = report_data.get("checklist", [])
    report.competency_analysis = report_data.get("competency_analysis", [])
    report.fit_analysis = report_data.get("fit_analysis", "")
    report.motive = report_data.get("motive", "")
    report.collaboration = report_data.get("collaboration", "")
    report.strength = report_data.get("strength", [])
    report.concern = report_data.get("concern", [])
    report.check_point = report_data.get("check_point", [])
    report.interview_question = _build_interview_question(report_data)
    report.final_comment = report_data.get("final_comment", "")
    report.status = AnalysisReport.STATUS_DONE
    return report


def initialize_celery_worker_availability():
    global _CELERY_WORKER_AVAILABLE

    try:
        timeout = getattr(settings, "CELERY_WORKER_PING_TIMEOUT", 1.0)
        _CELERY_WORKER_AVAILABLE = bool(current_app.control.ping(timeout=timeout))
    except Exception:
        _CELERY_WORKER_AVAILABLE = False

    return _CELERY_WORKER_AVAILABLE


def is_celery_worker_available():
    if _CELERY_WORKER_AVAILABLE is None:
        return initialize_celery_worker_availability()

    return _CELERY_WORKER_AVAILABLE


def analyze_and_save_report(report_id):
    try:
        with transaction.atomic():
            report = (
                AnalysisReport.objects.select_for_update()
                .select_related("resume", "resume__job_description", "resume__job_description__account")
                .get(id=report_id)
            )
            resume = report.resume
            job_description = resume.job_description
            company_info, _ = CompanyInfo.objects.get_or_create(account=job_description.account)

            report.status = AnalysisReport.STATUS_PROCESSING
            report.save(update_fields=["status"])

            inputs = {
                "company": company_info.to_dict(),
                "jd": job_description.to_dict(),
                "resume": resume.to_dict(),
                "checklist": list(
                    job_description.checklists.order_by("id").values_list("content", flat=True)
                ),
            }
    except AnalysisReport.DoesNotExist:
        return None

    analysis_result = report_service.invoke(
        company_dict=inputs["company"],
        jd_dict=inputs["jd"],
        checklist=inputs["checklist"],
        resume_dict=inputs["resume"],
    )

    try:
        with transaction.atomic():
            report = AnalysisReport.objects.select_for_update().get(id=report_id)
            _apply_analysis_result(report, analysis_result)
            report.save()

            return report.to_dict()
    except AnalysisReport.DoesNotExist:
        return None


@shared_task
def enqueue_report_analyze(report_id):
    return analyze_and_save_report(report_id)
