import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Input, Row, Space } from 'antd';
import { FileSearchOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  CoverLetterInputPanel,
} from '../components/cover-letter/CoverLetterInputPanel';
import { CoverLetterDeleteModal } from '../components/cover-letter/CoverLetterDeleteModal';
import { CoverLetterUploadPanel } from '../components/cover-letter/CoverLetterUploadPanel';
import { InlineLoading } from '../components/common/InlineLoading';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SearchSuggestions } from '../components/common/SearchSuggestions';
import { SectionCard } from '../components/common/SectionCard';
import type { CoverLetterRow } from '../api/adapters';
import { useCoverLetterPageData } from '../hooks/useCoverLetterPageData';
import { COVER_SEARCH_SUGGESTIONS, useCoverLetterFilters } from '../hooks/useCoverLetterFilters';
import { useJdChecklist } from '../hooks/useJdChecklist';
import { useResumeMutations } from '../hooks/mutations/useResumeMutations';
import type { Navigate, ShowAlert } from '../types/app';
import { getStoredApiKey } from '../utils/apiKeySession';
import { getAnalysisCreditCost, getAnalysisCreditText, hasEnoughAnalysisCredit } from '../utils/analysisCredit';
import { pageSectionGutter } from '../utils/layout';
import {
  toggleSuggestionInSearchText,
} from '../utils/searchSuggestions';
import {
  toCoverLetterInitialValues,
  toCoverLetterPayload,
  toEmptyCoverLetterValues,
  type CoverLetterInputFormValues,
} from '../models/coverLetterFormModel';

type CoverLetterPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

export function CoverLetterPage({ navigate, showAlert }: CoverLetterPageProps) {
  const [form] = Form.useForm<CoverLetterInputFormValues>();
  const [isCreatingCoverLetter, setIsCreatingCoverLetter] = useState(false);
  const [deleteTargetResume, setDeleteTargetResume] = useState<CoverLetterRow | null>(null);
  const [coverSearchText, setCoverSearchText] = useState('');
  const { coverRows, jdList, resumes, selectedJdId, selectedResumeId, setSelectedJdId, setSelectedResumeId, userProfile } =
    useCoverLetterPageData();
  const { addResume, analyzeResume, deleteResume, saveResume } = useResumeMutations(showAlert);
  const isApiKeyMode = Boolean(getStoredApiKey());
  const analysisCreditCost = getAnalysisCreditCost(userProfile, isApiKeyMode);
  const analysisCreditText = getAnalysisCreditText(analysisCreditCost, isApiKeyMode);
  const creditDisabledReason = hasEnoughAnalysisCredit(userProfile, analysisCreditCost) ? undefined : 'Credit이 부족합니다.';
  const analysisCreditDisplayText = creditDisabledReason ? `${analysisCreditText} · Credit 부족` : analysisCreditText;
  const canCreateResume = !isApiKeyMode;
  const currentResume = useMemo(
    () => resumes.find((resume) => String(resume.id) === selectedResumeId) ?? null,
    [resumes, selectedResumeId],
  );
  const editingResume = isCreatingCoverLetter ? null : currentResume;
  const checklistQuery = useJdChecklist(editingResume ? String(editingResume.job_description_id) : null);
  const checklistItems = checklistQuery.data ?? [];
  const initialValues = useMemo(
    () =>
      isCreatingCoverLetter
        ? toEmptyCoverLetterValues(selectedJdId)
        : toCoverLetterInitialValues(selectedJdId, editingResume),
    [editingResume, isCreatingCoverLetter, selectedJdId],
  );
  const hasCurrentResume = Boolean(editingResume);
  const isEditMode = Boolean(editingResume);
  const checklistAnalysisDisabledReason =
    editingResume && checklistQuery.isLoading
      ? 'JD 체크리스트를 불러오는 중입니다.'
      : editingResume && checklistQuery.isError
        ? 'JD 체크리스트를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.'
        : editingResume && checklistItems.length === 0
          ? '연결된 JD에 체크리스트가 없습니다.'
          : undefined;
  const canAnalyze = Boolean(
    editingResume && !isCreatingCoverLetter && !checklistAnalysisDisabledReason && !creditDisabledReason,
  );
  const {
    filteredRows: filteredCoverRows,
    selectedSuggestions: selectedCoverSuggestions,
    suggestionQuery: coverSuggestionQuery,
  } = useCoverLetterFilters(coverRows, coverSearchText);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  const startCreateCoverLetter = () => {
    if (!canCreateResume) {
      showAlert({ type: 'info', message: 'API Key 모드에서는 새 자소서를 등록할 수 없습니다.' });
      return;
    }

    setIsCreatingCoverLetter(true);
    form.setFieldsValue(toEmptyCoverLetterValues(selectedJdId));
  };

  const toggleCoverSuggestion = (suggestion: string) => {
    setCoverSearchText((current) => toggleSuggestionInSearchText(current, COVER_SEARCH_SUGGESTIONS, suggestion));
  };

  const selectResume = (resumeId: string) => {
    const nextResume = resumes.find((resume) => String(resume.id) === resumeId);

    setIsCreatingCoverLetter(false);
    setSelectedResumeId(resumeId);

    if (nextResume) {
      setSelectedJdId(String(nextResume.job_description_id));
      form.resetFields();
      form.setFieldsValue(toCoverLetterInitialValues(null, nextResume));
    }
  };

  const requestDeleteResume = (resumeId: string) => {
    const targetResume = coverRows.find((row) => row.key === resumeId);

    if (!targetResume) {
      showAlert({ type: 'warning', message: '삭제할 자소서를 찾을 수 없습니다.' });
      return;
    }

    setDeleteTargetResume(targetResume);
  };

  const closeDeleteResumeModal = () => {
    if (!deleteResume.isPending) {
      setDeleteTargetResume(null);
    }
  };

  const confirmDeleteResume = async () => {
    if (!deleteTargetResume) {
      return;
    }

    const targetId = deleteTargetResume.key;
    await deleteResume.mutateAsync(Number(targetId));
    setDeleteTargetResume(null);

    if (selectedResumeId === targetId) {
      const nextResume = resumes.find((resume) => String(resume.id) !== targetId);

      if (nextResume) {
        selectResume(String(nextResume.id));
      } else if (canCreateResume) {
        setSelectedResumeId(null);
        setIsCreatingCoverLetter(true);
        form.resetFields();
        form.setFieldsValue(toEmptyCoverLetterValues(selectedJdId));
      } else {
        setSelectedResumeId(null);
        setIsCreatingCoverLetter(false);
        form.resetFields();
        form.setFieldsValue(toEmptyCoverLetterValues(selectedJdId));
      }
    }
  };

  const saveCurrentResume = async () => {
    const values = await form.validateFields();
    const allValues = form.getFieldsValue(true) as CoverLetterInputFormValues;
    const jobDescriptionId = values.job_description_id;

    if (!jobDescriptionId) {
      form.setFields([
        {
          name: 'job_description_id',
          errors: ['JD를 선택한 뒤 저장해 주세요.'],
        },
      ]);
      return;
    }

    const payload = toCoverLetterPayload(values, allValues);

    if (editingResume) {
      const response = await saveResume.mutateAsync({ id: editingResume.id, ...payload });
      setSelectedResumeId(String(response.data.id));
    } else {
      if (!canCreateResume) {
        showAlert({ type: 'info', message: 'API Key 모드에서는 새 자소서를 등록할 수 없습니다.' });
        return;
      }

      const response = await addResume.mutateAsync({ job_description_id: jobDescriptionId, ...payload });
      setSelectedResumeId(String(response.data.id));
      setSelectedJdId(String(response.data.job_description_id));
    }

    setIsCreatingCoverLetter(false);
  };

  const requestAnalysis = async () => {
    if (!editingResume || checklistAnalysisDisabledReason || creditDisabledReason) {
      if (checklistAnalysisDisabledReason) {
        showAlert({ type: 'warning', message: checklistAnalysisDisabledReason });
      } else if (creditDisabledReason) {
        showAlert({ type: 'warning', message: creditDisabledReason });
      }
      return;
    }

    const response = await analyzeResume.mutateAsync(editingResume.id);
    const reportId = response.data.report.id;
    const resumeId = response.data.report.resume_id || response.data.resume_id;
    navigate(reportId ? `/analysis-report?reportId=${reportId}` : `/analysis-report?resumeId=${resumeId}`);
  };

  return (
    <div className="cover-letter-page viewport-page">
      <PageTitle
        eyebrow="Resume"
        title="자소서 관리"
        description="저장된 자소서를 확인하고, 선택한 JD에 맞춰 작성/수정 후 분석 요청을 진행합니다."
        actions={
          <Space wrap>
            <span className={`analysis-credit-cost${creditDisabledReason ? ' analysis-credit-cost--danger' : ''}`}>
              {analysisCreditDisplayText}
            </span>
            <Button
              icon={<SaveOutlined />}
              loading={saveResume.isPending || addResume.isPending}
              disabled={isApiKeyMode && !editingResume}
              onClick={() => void saveCurrentResume()}
            >
              저장
            </Button>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              disabled={!canAnalyze || analyzeResume.isPending}
              title={checklistAnalysisDisabledReason ?? creditDisabledReason}
              onClick={() => void requestAnalysis()}
            >
              {analyzeResume.isPending ? <InlineLoading label="분석 중" /> : '분석 요청'}
            </Button>
          </Space>
        }
      />
      <Row className="section-row split-editor-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={8}>
          <SectionCard
            className="scroll-card-body"
            title="자소서 목록"
            extra={
              canCreateResume ? (
                <Button size="small" icon={<PlusOutlined />} onClick={startCreateCoverLetter}>
                  새 자소서 작성
                </Button>
              ) : null
            }
          >
            {coverRows.length ? (
              <div className="list-query-controls">
                <Input
                  allowClear
                  className="list-query-input"
                  placeholder="지원자, JD, 기술 검색"
                  value={coverSearchText}
                  onChange={(event) => setCoverSearchText(event.target.value)}
                />
                <span className="list-query-count">
                  {filteredCoverRows.length} / {coverRows.length}건
                </span>
                <SearchSuggestions
                  ariaLabel="자소서 추천검색어"
                  query={coverSuggestionQuery}
                  selectedValues={selectedCoverSuggestions}
                  suggestions={COVER_SEARCH_SUGGESTIONS}
                  onToggle={toggleCoverSuggestion}
                />
              </div>
            ) : null}
            <CoverLetterUploadPanel
              coverRows={filteredCoverRows}
              hasSavedResume={hasCurrentResume}
              selectedResumeId={isCreatingCoverLetter ? null : selectedResumeId}
              onSelectResume={selectResume}
              onDeleteResume={requestDeleteResume}
              canCreateResume={canCreateResume}
              emptyDescription={coverRows.length ? '조건에 맞는 자소서가 없습니다.' : undefined}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard className="scroll-card-body" title="자소서 작성/수정">
            {isApiKeyMode && !editingResume ? (
              <EmptyState description="왼쪽 목록에서 API Key로 허용된 자소서를 선택해 주세요." />
            ) : (
              <>
                {editingResume && checklistAnalysisDisabledReason ? (
                  <Alert
                    showIcon
                    type={checklistQuery.isError ? 'error' : 'warning'}
                    className="cover-letter-checklist-alert"
                    message={checklistAnalysisDisabledReason}
                    description={
                      <div className="cover-letter-checklist-alert-body">
                        <span>지원서 분석은 JD 체크리스트를 기준으로 진행됩니다.</span>
                        {checklistItems.length === 0 && !checklistQuery.isLoading && !checklistQuery.isError ? (
                          <Button size="small" onClick={() => navigate('/jd')}>
                            JD 체크리스트 만들러 가기
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                ) : null}
                <CoverLetterInputPanel
                  jdList={jdList}
                  form={form}
                  initialValues={initialValues}
                  mode={isEditMode ? 'edit' : 'create'}
                  setSelectedJdId={setSelectedJdId}
                />
              </>
            )}
          </SectionCard>
        </Col>
      </Row>
      <CoverLetterDeleteModal
        targetResume={deleteTargetResume}
        deleting={deleteResume.isPending}
        onCancel={closeDeleteResumeModal}
        onConfirm={() => void confirmDeleteResume()}
      />
    </div>
  );
}
