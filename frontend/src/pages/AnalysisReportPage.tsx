import { useEffect, useState } from 'react';
import { Button, Col, Form, Row, Tag } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { apiClient } from '../api/backendClient';
import { ReportDetailPanel } from '../components/analysis-report/ReportDetailPanel';
import { ReportListPanel } from '../components/analysis-report/ReportListPanel';
import {
  canSaveReportFeedback,
  createReportFeedbackDraft,
  formatReportTimestamp,
  getReportDeleteWarning,
  getReportFeedbackValue,
  isReportDeleteBlocked,
  isReportPending,
  reportEditInitialValues,
  reportEditPayload,
  type ReportEditFormValues,
  type ReportFeedbackDraft,
} from '../components/analysis-report/reportPresentation';
import { DestructiveConfirmModal } from '../components/common/DestructiveConfirmModal';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import { useAnalysisReportPageData, type AnalysisReportItem } from '../hooks/useAnalysisReportPageData';
import { useReportFilters } from '../hooks/useReportFilters';
import type { Navigate, ShowAlert } from '../types/app';
import { getStoredApiKey } from '../utils/apiKeySession';
import { pageSectionGutter } from '../utils/layout';

type AnalysisReportPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

export function AnalysisReportPage({ navigate, showAlert }: AnalysisReportPageProps) {
  const { refreshing, reloadData, reportItems, reportTreeItems, selectedReportId, setSelectedReportId } =
    useAnalysisReportPageData();
  const {
    displaySelectedItem,
    filteredReportItems,
    filteredReportTreeItems,
    searchText,
    selectedSuggestions,
    setSearchText,
    suggestionQuery,
    toggleSuggestion,
  } = useReportFilters({ reportItems, reportTreeItems, selectedReportId });
  const [reportForm] = Form.useForm<ReportEditFormValues>();
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState<ReportFeedbackDraft>(() => createReportFeedbackDraft());
  const [deleteTargetItem, setDeleteTargetItem] = useState<AnalysisReportItem | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const apiKey = getStoredApiKey() ?? undefined;
  const isApiKeyMode = Boolean(apiKey);
  const isEditingReport = Boolean(displaySelectedItem && editingReportId === displaySelectedItem.report.id);
  const selectedFeedbackReport = displaySelectedItem?.report ?? null;
  const selectedFeedbackReportId = selectedFeedbackReport?.id ?? null;
  const selectedFeedbackRating = selectedFeedbackReport ? getReportFeedbackValue(selectedFeedbackReport) : 0;
  const selectedFeedbackReviewText = selectedFeedbackReport?.review_text ?? '';
  const activeFeedbackDraft =
    feedbackDraft.reportId === selectedFeedbackReportId &&
    feedbackDraft.sourceRating === selectedFeedbackRating &&
    feedbackDraft.sourceReviewText === selectedFeedbackReviewText
      ? feedbackDraft
      : createReportFeedbackDraft(selectedFeedbackReport);
  const feedbackRatingChanged =
    activeFeedbackDraft.rating >= 1 &&
    activeFeedbackDraft.rating <= 5 &&
    activeFeedbackDraft.rating !== activeFeedbackDraft.savedRating;
  const normalizedFeedbackReviewText = activeFeedbackDraft.reviewText.trim();
  const feedbackReviewTextChanged = normalizedFeedbackReviewText !== activeFeedbackDraft.savedReviewText.trim();
  const hasFeedbackChanges = feedbackRatingChanged || feedbackReviewTextChanged;
  const feedbackEnabled = Boolean(selectedFeedbackReport && canSaveReportFeedback(selectedFeedbackReport));

  useEffect(() => {
    if (displaySelectedItem && selectedReportId !== String(displaySelectedItem.report.id)) {
      setSelectedReportId(String(displaySelectedItem.report.id));
    }
  }, [displaySelectedItem, selectedReportId, setSelectedReportId]);

  useEffect(() => {
    if (displaySelectedItem) {
      reportForm.setFieldsValue(reportEditInitialValues(displaySelectedItem.report));
    }
  }, [displaySelectedItem?.report.id, displaySelectedItem, reportForm]);

  const startReportEdit = () => {
    if (!displaySelectedItem || isReportPending(displaySelectedItem.report)) return;
    reportForm.setFieldsValue(reportEditInitialValues(displaySelectedItem.report));
    setEditingReportId(displaySelectedItem.report.id);
  };

  const cancelReportEdit = () => {
    if (displaySelectedItem) {
      reportForm.setFieldsValue(reportEditInitialValues(displaySelectedItem.report));
    }
    setEditingReportId(null);
  };

  const saveReportEdit = async (values: ReportEditFormValues) => {
    if (!displaySelectedItem || isReportPending(displaySelectedItem.report)) return;
    setIsSavingReport(true);

    try {
      const response = await apiClient.saveReport(reportEditPayload(displaySelectedItem.report.id, values), apiKey);
      await reloadData();
      setEditingReportId(null);
      showAlert({ type: 'success', message: response.message ?? '분석 리포트를 저장했습니다.' });
    } catch (error) {
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : '분석 리포트를 저장하지 못했습니다.',
      });
    } finally {
      setIsSavingReport(false);
    }
  };

  const saveReportFeedback = async () => {
    if (!selectedFeedbackReport || !feedbackEnabled || isSavingFeedback || !hasFeedbackChanges) return;
    const payload: { id: number; user_feedback?: number; review_text?: string } = { id: selectedFeedbackReport.id };

    if (feedbackRatingChanged) payload.user_feedback = activeFeedbackDraft.rating;
    if (feedbackReviewTextChanged) payload.review_text = normalizedFeedbackReviewText;

    const savedReportId = selectedFeedbackReport.id;
    const savedDraft = activeFeedbackDraft;
    setIsSavingFeedback(true);

    try {
      const response = await apiClient.saveReport(payload, apiKey);
      await reloadData();
      const savedRating =
        response.data.user_feedback !== undefined
          ? getReportFeedbackValue(response.data)
          : payload.user_feedback ?? savedDraft.savedRating;
      const savedReviewText =
        response.data.review_text !== undefined
          ? response.data.review_text ?? ''
          : payload.review_text ?? savedDraft.savedReviewText;

      setFeedbackDraft((current) =>
        current.reportId === savedReportId
          ? {
              ...savedDraft,
              reportId: savedReportId,
              rating: savedRating,
              reviewText: savedReviewText,
              savedRating,
              savedReviewText,
            }
          : current,
      );
      showAlert({ type: 'success', message: response.message ?? '사용자 리뷰를 저장했습니다.' });
    } catch (error) {
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : '사용자 리뷰를 저장하지 못했습니다.',
      });
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const updateFeedbackRating = (rating: number) => {
    if (!selectedFeedbackReport || !feedbackEnabled || isSavingFeedback || rating < 1 || rating > 5) return;
    setFeedbackDraft((current) => ({
      ...(current.reportId === selectedFeedbackReport.id ? current : createReportFeedbackDraft(selectedFeedbackReport)),
      rating,
    }));
  };

  const updateFeedbackReviewText = (reviewText: string) => {
    if (!selectedFeedbackReport || !feedbackEnabled || isSavingFeedback) return;
    setFeedbackDraft((current) => ({
      ...(current.reportId === selectedFeedbackReport.id ? current : createReportFeedbackDraft(selectedFeedbackReport)),
      reviewText,
    }));
  };

  const openDeleteReportModal = () => {
    if (!displaySelectedItem || isReportDeleteBlocked(displaySelectedItem.report)) return;
    setDeleteErrorMessage('');
    setDeleteTargetItem(displaySelectedItem);
  };

  const closeDeleteReportModal = () => {
    if (isDeletingReport) return;
    setDeleteTargetItem(null);
    setDeleteErrorMessage('');
  };

  const confirmDeleteReport = async () => {
    if (!deleteTargetItem) return;
    const deletedReportId = deleteTargetItem.report.id;
    const nextReportItem = filteredReportItems.find((item) => item.report.id !== deletedReportId) ?? null;
    setIsDeletingReport(true);
    setDeleteErrorMessage('');

    try {
      await apiClient.deleteReport(deletedReportId, apiKey);
      setSelectedReportId(nextReportItem ? String(nextReportItem.report.id) : '');
      await reloadData();
      if (editingReportId === deletedReportId) setEditingReportId(null);
      setDeleteTargetItem(null);
    } catch (error) {
      setDeleteErrorMessage(error instanceof Error ? error.message : '리포트 삭제에 실패했습니다.');
    } finally {
      setIsDeletingReport(false);
    }
  };

  return (
    <div className="analysis-report-page viewport-page">
      <PageTitle
        eyebrow="Analysis Report"
        title="분석 리포트 / 질문 추천"
        description="지원자별 분석 리포트와 추천 면접 질문을 분리해서 확인합니다."
        actions={
          isApiKeyMode ? null : (
            <Button icon={<MessageOutlined />} disabled={!displaySelectedItem} onClick={() => navigate('/chat')}>
              채팅으로 질문하기
            </Button>
          )
        }
      />
      <Row className="section-row split-editor-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={8}>
          <SectionCard className="scroll-card-body" title="리포트 목록">
            <ReportListPanel
              allItems={reportItems}
              filteredItems={filteredReportItems}
              treeItems={filteredReportTreeItems}
              selectedReportId={displaySelectedItem?.report.id ?? null}
              searchText={searchText}
              suggestionQuery={suggestionQuery}
              selectedSuggestions={selectedSuggestions}
              onSearchTextChange={setSearchText}
              onToggleSuggestion={toggleSuggestion}
              onSelectReport={setSelectedReportId}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard className="scroll-card-body" title="리포트 / 질문 상세">
            {displaySelectedItem ? (
              <ReportDetailPanel
                item={displaySelectedItem}
                refreshing={refreshing}
                editing={isEditingReport}
                savingReport={isSavingReport}
                reportForm={reportForm}
                feedbackRating={activeFeedbackDraft.rating}
                feedbackReviewText={activeFeedbackDraft.reviewText}
                feedbackEnabled={feedbackEnabled}
                feedbackSaving={isSavingFeedback}
                feedbackHasChanges={hasFeedbackChanges}
                onStartEdit={startReportEdit}
                onCancelEdit={cancelReportEdit}
                onSubmitEdit={(values) => void saveReportEdit(values)}
                onOpenDelete={openDeleteReportModal}
                onReload={() => void reloadData()}
                onFeedbackRatingChange={updateFeedbackRating}
                onFeedbackReviewTextChange={updateFeedbackReviewText}
                onSaveFeedback={() => void saveReportFeedback()}
              />
            ) : (
              <EmptyState description="분석 요청을 완료하면 리포트와 질문 추천이 표시됩니다." />
            )}
          </SectionCard>
        </Col>
      </Row>
      <DestructiveConfirmModal
        open={Boolean(deleteTargetItem)}
        title="리포트를 삭제하시겠습니까?"
        description={
          <>
            삭제한 리포트와 질문 추천은 복구할 수 없습니다. 지원서와 JD 데이터는 삭제되지 않습니다.
            {deleteErrorMessage ? <span className="destructive-confirm-error">{deleteErrorMessage}</span> : null}
          </>
        }
        target={
          deleteTargetItem
            ? {
                title: `${deleteTargetItem.resume?.name || '지원자 정보 없음'} · 리포트`,
                description: deleteTargetItem.jd?.title || '연결 JD 없음',
                extra: (
                  <span className="analysis-report-delete-meta">
                    <Tag>{deleteTargetItem.report.overall_grade || 'N/A'} 등급</Tag>
                    <span>{formatReportTimestamp(deleteTargetItem.report.created_at)}</span>
                  </span>
                ),
                ariaLabel: '삭제할 리포트',
              }
            : null
        }
        warning={deleteTargetItem ? getReportDeleteWarning(deleteTargetItem.report) : undefined}
        loading={isDeletingReport}
        cancelLabel="취소"
        confirmLabel="삭제"
        confirmAriaLabel="삭제"
        onCancel={closeDeleteReportModal}
        onConfirm={() => void confirmDeleteReport()}
      />
    </div>
  );
}
