import logging

from celery import shared_task
from celery import current_app
from django.conf import settings
from django.db import transaction
from django.db.models import F

from common import analysis_graph, checklist_graph

from .models import Account, AnalysisReport, AuthKey, Checklist, CompanyInfo, JobDescription

_CELERY_WORKER_AVAILABLE = None
logger = logging.getLogger(__name__)


def _build_interview_question(report_data):
    """analysis_graph.invoke() 결과의 question 필드를 DB 저장용 interview_question으로 정리합니다."""

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
    """분석 그래프 결과를 AnalysisReport 모델 필드에 매핑합니다."""

    report.version = analysis_graph.get_version()
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


def _mark_report_failed(report_id):
    return (
        AnalysisReport.objects.filter(id=report_id)
        .exclude(status__in=[AnalysisReport.STATUS_DONE, AnalysisReport.STATUS_FAIL])
        .update(status=AnalysisReport.STATUS_FAIL)
    )

def refund_report_credit(account_id=None, api_key_id=None, credit_spent=0):
    if not credit_spent:
        return

    if api_key_id is not None:
        AuthKey.objects.filter(pk=api_key_id).update(
            credit_limit=F("credit_limit") + credit_spent
        )
        return

    if account_id is not None:
        Account.objects.filter(pk=account_id).update(credit=F("credit") + credit_spent)


def _try_mark_report_failed(report_id):
    try:
        return _mark_report_failed(report_id) > 0
    except Exception:
        return False


def _handle_report_failure(report_id, account_id=None, api_key_id=None, credit_spent=0):
    if _try_mark_report_failed(report_id):
        refund_report_credit(
            account_id=account_id,
            api_key_id=api_key_id,
            credit_spent=credit_spent,
        )


def _get_checklist_generation_count(job_description, cnt):
    checklist_count = job_description.checklists.count()
    remaining_count = max(0, checklist_graph.CHECKLIST_COUNT - checklist_count)
    return min(cnt, checklist_graph.CHECKLIST_COUNT) if cnt > 0 else remaining_count


def _mark_job_description_checklist_status(job_description_id, status):
    return JobDescription.objects.filter(id=job_description_id).update(
        checklist_status=status,
    )


def _save_generated_checklists(job_description, contents, save_limit):
    valid_contents = [
        content.strip()
        for content in contents
        if isinstance(content, str) and content.strip()
    ][:save_limit]

    Checklist.objects.bulk_create(
        [
            Checklist(job_description=job_description, content=content)
            for content in valid_contents
        ]
    )


def generate_and_save_checklists(job_description_id, query="", cnt=0):
    try:
        with transaction.atomic():
            job_description = (
                JobDescription.objects.select_for_update()
                .select_related("account")
                .get(id=job_description_id)
            )
            company_info, _ = CompanyInfo.objects.get_or_create(account=job_description.account)
            generation_count = _get_checklist_generation_count(job_description, cnt)

            job_description.checklist_status = JobDescription.CHECKLIST_STATUS_PROCESSING
            job_description.save(update_fields=["checklist_status"])

            inputs = {
                "company": company_info.to_masked_dict(),
                "jd": job_description.to_masked_dict(),
                "generation_count": generation_count,
                "save_limit": generation_count,
            }
    except JobDescription.DoesNotExist:
        logger.info(
            "Skipped checklist generation because job_description_id=%s no longer exists.",
            job_description_id,
        )
        return []
    except Exception:
        _mark_job_description_checklist_status(
            job_description_id,
            JobDescription.CHECKLIST_STATUS_FAIL,
        )
        raise

    try:
        if inputs["generation_count"]:
            generated_contents = checklist_graph.invoke(
                inputs["company"],
                inputs["jd"],
                inputs["generation_count"],
                user_query=query,
            )
        else:
            generated_contents = []

        with transaction.atomic():
            job_description = JobDescription.objects.select_for_update().get(id=job_description_id)
            _save_generated_checklists(
                job_description,
                generated_contents,
                inputs["save_limit"],
            )
            job_description.checklist_status = JobDescription.CHECKLIST_STATUS_DONE
            job_description.save(update_fields=["checklist_status"])

            logger.info(
                "Generated checklists: %s",
                generated_contents,
            )
            return generated_contents
    except JobDescription.DoesNotExist:
        logger.info(
            "Skipped saving generated checklists because job_description_id=%s no longer exists.",
            job_description_id,
        )
        return []
    except Exception:
        _mark_job_description_checklist_status(
            job_description_id,
            JobDescription.CHECKLIST_STATUS_FAIL,
        )
        raise


def analyze_and_save_report(report_id, account_id=None, api_key_id=None, credit_spent=0):
    """Celery/동기 fallback에서 실행되는 리포트 생성 전체 작업입니다."""

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
                "company": company_info.to_masked_dict(),
                "jd": job_description.to_masked_dict(),
                "resume": resume.to_masked_dict(),
                "checklist": list(
                    job_description.checklists.order_by("id").values_list("content", flat=True)
                ),
            }
    except AnalysisReport.DoesNotExist:
        logger.info(
            "Skipped report analysis because report_id=%s no longer exists.",
            report_id,
        )
        refund_report_credit(
            account_id=account_id,
            api_key_id=api_key_id,
            credit_spent=credit_spent,
        )
        return None
    except Exception:
        _handle_report_failure(
            report_id,
            account_id=account_id,
            api_key_id=api_key_id,
            credit_spent=credit_spent,
        )
        raise

    try:
        analysis_result = analysis_graph.invoke(
            company_dict=inputs["company"],
            jd_dict=inputs["jd"],
            checklist=inputs["checklist"],
            resume_dict=inputs["resume"],
        )

        with transaction.atomic():
            report = AnalysisReport.objects.select_for_update().get(id=report_id)
            _apply_analysis_result(report, analysis_result)
            report.save()

            return report.to_dict()
    except AnalysisReport.DoesNotExist:
        logger.info(
            "Skipped saving analysis result because report_id=%s no longer exists.",
            report_id,
        )
        refund_report_credit(
            account_id=account_id,
            api_key_id=api_key_id,
            credit_spent=credit_spent,
        )
        return None
    except Exception:
        _handle_report_failure(
            report_id,
            account_id=account_id,
            api_key_id=api_key_id,
            credit_spent=credit_spent,
        )
        raise


@shared_task
def enqueue_report_analyze(report_id, account_id=None, api_key_id=None, credit_spent=0):
    """Celery worker가 실행하는 분석 리포트 생성 task입니다."""

    return analyze_and_save_report(
        report_id,
        account_id=account_id,
        api_key_id=api_key_id,
        credit_spent=credit_spent,
    )


@shared_task
def enqueue_jd_checklist_analyze(job_description_id, query="", cnt=0):
    return generate_and_save_checklists(
        job_description_id,
        query=query,
        cnt=cnt,
    )
