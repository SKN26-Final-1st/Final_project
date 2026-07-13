import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Input, Row, Space } from 'antd';
import { FileSearchOutlined, MessageOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { JdChecklistPanel } from '../components/jd/JdChecklistPanel';
import { JdChatDrawer } from '../components/jd/JdChatDrawer';
import { JdDeleteModal } from '../components/jd/JdDeleteModal';
import { JdEditorPanel } from '../components/jd/JdEditorPanel';
import { JdListEmptyState } from '../components/jd/JdListEmptyState';
import { JdListPanel } from '../components/jd/JdListPanel';
import { EmptyState } from '../components/common/PageState';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem } from '../api/adapters';
import type { JobDescriptionChecklistStatus } from '../data/backendTypes';
import { useJdPageData } from '../hooks/useJdPageData';
import { useJdChecklist } from '../hooks/useJdChecklist';
import { useJdFilters } from '../hooks/useJdFilters';
import { useJdMutations } from '../hooks/mutations/useJdMutations';
import type { Navigate, ShowAlert } from '../types/app';
import { getStoredApiKey } from '../utils/apiKeySession';
import { getAnalysisCreditCost, getAnalysisCreditText, hasEnoughAnalysisCredit } from '../utils/analysisCredit';
import { pageSectionGutter } from '../utils/layout';
import {
  EMPTY_JD_EDITOR_VALUES,
  normalizeJdEditorValues,
  toJdEditorValues,
  type JdEditorFormValues,
} from '../models/jdFormModel';

type JdPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

function getChecklistGenerateBlockedReason(status: JobDescriptionChecklistStatus) {
  if (status === 'onqueue') {
    return '체크리스트 생성 요청이 대기 중입니다.';
  }

  if (status === 'processing') {
    return '체크리스트를 생성하는 중입니다.';
  }

  if (status === 'fail') {
    return '이전 체크리스트 생성 요청이 실패했습니다. 확인 후 다시 요청해주세요.';
  }

  return undefined;
}

export function JdPage({ navigate, showAlert }: JdPageProps) {
  const [form] = Form.useForm<JdEditorFormValues>();
  const [isCreatingJd, setIsCreatingJd] = useState(false);
  const [deleteTargetJd, setDeleteTargetJd] = useState<JdItem | null>(null);
  const [jdSearchText, setJdSearchText] = useState('');
  const [isJdChatOpen, setIsJdChatOpen] = useState(false);
  const [checklistGenerateQuery, setChecklistGenerateQuery] = useState('');
  const [checklistGenerateCount, setChecklistGenerateCount] = useState(0);
  const { jdList, reloadData, resumes, selectedJdId, selectedJd, setSelectedJdId, userProfile } = useJdPageData();
  const {
    addChecklist,
    addJd,
    analyzeJd,
    deleteChecklist,
    deleteJd,
    generateChecklist,
    refreshChecklistFailure,
    saveJd,
    updateChecklist,
  } = useJdMutations(showAlert);
  const isApiKeyMode = Boolean(getStoredApiKey());
  const analysisCreditCost = getAnalysisCreditCost(userProfile, isApiKeyMode);
  const analysisCreditText = getAnalysisCreditText(analysisCreditCost, isApiKeyMode);
  const creditDisabledReason = hasEnoughAnalysisCredit(userProfile, analysisCreditCost) ? undefined : 'Credit이 부족합니다.';
  const analysisCreditDisplayText = creditDisabledReason ? `${analysisCreditText} · Credit 부족` : analysisCreditText;
  const canCreateJd = !isApiKeyMode;
  const isEmptyJdList = jdList.length === 0;
  const isCreateMode = canCreateJd && (isCreatingJd || isEmptyJdList);
  const editorInitialValues = useMemo(
    () => (isCreateMode ? EMPTY_JD_EDITOR_VALUES : selectedJd ? toJdEditorValues(selectedJd) : undefined),
    [isCreateMode, selectedJd],
  );
  const showEditor = isCreateMode || Boolean(selectedJd && editorInitialValues);
  const checklistStatus = selectedJd?.checklistStatus ?? 'done';
  const checklistGenerateBlockedReason = getChecklistGenerateBlockedReason(checklistStatus);
  const selectedJdResumes = useMemo(
    () => (selectedJd ? resumes.filter((resume) => String(resume.job_description_id) === selectedJd.id) : []),
    [resumes, selectedJd],
  );
  const analysisTargetResume = selectedJdResumes.length === 1 ? selectedJdResumes[0] : null;
  const analysisDisabledReason =
    selectedJd && selectedJdResumes.length > 1
      ? '연결된 자소서가 여러 개입니다. 자소서 페이지에서 분석할 지원자를 선택해 주세요.'
      : selectedJd && selectedJdResumes.length === 0
        ? '먼저 자소서를 저장한 뒤 분석 요청해 주세요.'
        : undefined;
  const checklistQuery = useJdChecklist(!isCreateMode && selectedJd ? selectedJd.id : null);
  const checklistItems = checklistQuery.data ?? [];
  const checklistAnalysisDisabledReason =
    selectedJd && analysisTargetResume && checklistQuery.isLoading
      ? 'JD 체크리스트를 불러오는 중입니다.'
      : selectedJd && analysisTargetResume && checklistQuery.isError
        ? 'JD 체크리스트를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.'
        : selectedJd && analysisTargetResume && checklistItems.length === 0
          ? '지원서 분석 전에 JD 체크리스트를 먼저 생성해주세요.'
          : undefined;
  const combinedAnalysisDisabledReason = analysisDisabledReason ?? checklistAnalysisDisabledReason ?? creditDisabledReason;
  const canRequestAnalysis = Boolean(
    !isCreateMode &&
      selectedJd &&
      analysisTargetResume &&
      !analyzeJd.isPending &&
      !checklistAnalysisDisabledReason &&
      !creditDisabledReason,
  );
  const filteredJdList = useJdFilters(jdList, jdSearchText);

  useEffect(() => {
    if (isCreateMode) {
      form.setFieldsValue(EMPTY_JD_EDITOR_VALUES);
      return;
    }

    if (selectedJd) {
      form.setFieldsValue(toJdEditorValues(selectedJd));
    }
  }, [form, isCreateMode, selectedJd]);

  const startCreateJd = () => {
    if (!canCreateJd) {
      showAlert({ type: 'info', message: 'API Key 모드에서는 새 JD를 등록할 수 없습니다.' });
      return;
    }

    setIsCreatingJd(true);
    form.setFieldsValue(EMPTY_JD_EDITOR_VALUES);
  };

  const selectExistingJd = (id: string) => {
    setIsCreatingJd(false);
    setSelectedJdId(id);
  };

  const saveSelectedJd = async () => {
    if (!selectedJd && !isCreateMode) {
      return;
    }

    const values = await form.validateFields();
    const normalizedValues = normalizeJdEditorValues(values);

    if (!normalizedValues.required_skill.length) {
      form.setFields([{ name: 'required_skill', errors: ['필수 기술을 입력하세요.'] }]);
      return;
    }

    form.setFields([{ name: 'required_skill', errors: [] }]);

    if (isCreateMode) {
      if (!canCreateJd) {
        showAlert({ type: 'info', message: 'API Key 모드에서는 새 JD를 등록할 수 없습니다.' });
        return;
      }

      const response = await addJd.mutateAsync(normalizedValues);
      setIsCreatingJd(false);
      setSelectedJdId(String(response.data.id));
      return;
    }

    if (!selectedJd) {
      return;
    }

    await saveJd.mutateAsync({ id: Number(selectedJd.id), ...normalizedValues });
  };

  const requestDeleteJd = (id: string) => {
    const targetJd = jdList.find((item) => item.id === id);

    if (!targetJd) {
      showAlert({ type: 'warning', message: '삭제할 JD를 찾을 수 없습니다.' });
      return;
    }

    if (targetJd.checklistStatus === 'processing') {
      showAlert({
        type: 'warning',
        message: '체크리스트 생성이 진행 중이라 JD 삭제가 잠겼습니다. 완료 후 다시 시도해주세요.',
      });
      return;
    }

    setDeleteTargetJd(targetJd);
  };

  const closeDeleteModal = () => {
    if (!deleteJd.isPending) {
      setDeleteTargetJd(null);
    }
  };

  const confirmDeleteJd = async () => {
    if (!deleteTargetJd) {
      return;
    }

    const targetId = deleteTargetJd.id;
    await deleteJd.mutateAsync(Number(targetId));
    setDeleteTargetJd(null);

    if (selectedJdId === targetId) {
      const nextJd = jdList.find((item) => item.id !== targetId);

      if (nextJd) {
        setSelectedJdId(nextJd.id);
      } else if (canCreateJd) {
        startCreateJd();
      } else {
        setSelectedJdId(null);
      }
    }
  };

  const requestAnalysis = async () => {
    if (checklistAnalysisDisabledReason) {
      showAlert({
        type: 'warning',
        message: checklistAnalysisDisabledReason,
      });
      return;
    }

    if (creditDisabledReason) {
      showAlert({
        type: 'warning',
        message: creditDisabledReason,
      });
      return;
    }

    if (!analysisTargetResume || checklistAnalysisDisabledReason) {
      showAlert({
        type: 'warning',
        message: analysisDisabledReason ?? '분석할 지원자를 찾을 수 없습니다.',
      });
      return;
    }

    const response = await analyzeJd.mutateAsync(analysisTargetResume.id);
    const reportId = response.data.report.id;
    const resumeId = response.data.report.resume_id || response.data.resume_id;
    navigate(reportId ? `/analysis-report?reportId=${reportId}` : `/analysis-report?resumeId=${resumeId}`);
  };

  const requestChecklistGeneration = async () => {
    if (!selectedJd) {
      return;
    }

    if (checklistGenerateBlockedReason) {
      showAlert({
        type: 'warning',
        message: checklistGenerateBlockedReason,
      });
      return;
    }

    await generateChecklist.mutateAsync({
      jdId: Number(selectedJd.id),
      query: checklistGenerateQuery,
      cnt: checklistGenerateCount,
    });
  };

  const confirmChecklistFailure = async () => {
    if (!selectedJd) {
      return;
    }

    await refreshChecklistFailure.mutateAsync(Number(selectedJd.id));
  };

  const updateChecklistGenerateCount = (value: number) => {
    setChecklistGenerateCount(Math.max(0, Math.min(10, Math.trunc(value))));
  };

  const openJdChat = () => {
    if (isCreateMode || !selectedJd) {
      showAlert({ type: 'info', message: '채팅으로 JD를 작성하려면 먼저 JD를 저장해주세요.' });
      return;
    }

    setIsJdChatOpen(true);
  };

  return (
    <div className="jd-page viewport-page">
      <PageTitle
        eyebrow="JD Management"
        title="JD 관리"
        description="JD 목록과 작성 폼을 좌우로 배치해 저장, 삭제, 분석 요청 흐름을 확인합니다."
        actions={
          <Space wrap>
            <span className={`analysis-credit-cost${creditDisabledReason ? ' analysis-credit-cost--danger' : ''}`}>
              {analysisCreditDisplayText}
            </span>
            <Button
              icon={saveJd.isPending || addJd.isPending ? undefined : <SaveOutlined />}
              disabled={!showEditor || saveJd.isPending || addJd.isPending}
              onClick={() => void saveSelectedJd()}
            >
              {saveJd.isPending || addJd.isPending ? (
                <InlineLoading label={isCreateMode ? '등록 중' : '저장 중'} />
              ) : isCreateMode ? (
                'JD 등록'
              ) : (
                '저장'
              )}
            </Button>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              disabled={!canRequestAnalysis}
              title={combinedAnalysisDisabledReason}
              onClick={() => void requestAnalysis()}
            >
              {analyzeJd.isPending ? <InlineLoading label="분석 중" /> : '지원서 분석 요청'}
            </Button>
          </Space>
        }
      />
      <Row className="section-row split-editor-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={8}>
          <SectionCard
            className="scroll-card-body"
            title="JD 목록"
            extra={
              canCreateJd ? (
                <Button size="small" icon={<PlusOutlined />} onClick={startCreateJd}>
                  새 JD 작성
                </Button>
              ) : null
            }
          >
            <p className="list-panel-hint">JD를 선택하면 오른쪽 작성/수정 폼에 내용이 표시됩니다.</p>
            {jdList.length ? (
              <>
                <div className="list-query-controls">
                  <Input
                    allowClear
                    className="list-query-input"
                    placeholder="JD명, 업무, 기술 검색"
                    value={jdSearchText}
                    onChange={(event) => setJdSearchText(event.target.value)}
                  />
                  <span className="list-query-count">
                    {filteredJdList.length} / {jdList.length}건
                  </span>
                </div>
                {filteredJdList.length ? (
                  <JdListPanel
                    jdList={filteredJdList}
                    selectedJdId={isCreateMode ? null : selectedJdId}
                    setSelectedJdId={selectExistingJd}
                    onDeleteJd={requestDeleteJd}
                  />
                ) : (
                  <EmptyState description="조건에 맞는 JD가 없습니다." />
                )}
              </>
            ) : (
              isApiKeyMode ? (
                <EmptyState description="API Key로 접근 가능한 JD가 없습니다." />
              ) : (
                <JdListEmptyState />
              )
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard
            className="scroll-card-body"
            title="JD 작성/수정"
            extra={
              !isApiKeyMode ? (
                <Button
                  size="small"
                  icon={<MessageOutlined />}
                  disabled={isCreateMode || !selectedJd}
                  onClick={openJdChat}
                >
                  채팅으로 JD 작성
                </Button>
              ) : null
            }
          >
            {showEditor && editorInitialValues ? (
              <>
                <JdEditorPanel
                  form={form}
                  selectedJd={isCreateMode ? null : selectedJd}
                  initialValues={editorInitialValues}
                  mode={isCreateMode ? 'create' : 'edit'}
                />
                {!isCreateMode && selectedJd ? (
                  <JdChecklistPanel
                    adding={addChecklist.isPending}
                    deleting={deleteChecklist.isPending}
                    generating={generateChecklist.isPending}
                    generateCount={checklistGenerateCount}
                    generateQuery={checklistGenerateQuery}
                    generateBlockedReason={checklistGenerateBlockedReason}
                    items={checklistItems}
                    jobDescriptionId={Number(selectedJd.id)}
                    loading={checklistQuery.isLoading}
                    checklistStatus={checklistStatus}
                    refreshingFailure={refreshChecklistFailure.isPending}
                    updating={updateChecklist.isPending}
                    onAdd={addChecklist.mutateAsync}
                    onDelete={deleteChecklist.mutateAsync}
                    onGenerate={requestChecklistGeneration}
                    onGenerateCountChange={updateChecklistGenerateCount}
                    onGenerateQueryChange={setChecklistGenerateQuery}
                    onRefreshFailure={confirmChecklistFailure}
                    onUpdate={updateChecklist.mutateAsync}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState description="수정할 JD를 선택하거나 JD 목록에서 새 작성을 시작하세요." />
            )}
          </SectionCard>
        </Col>
      </Row>
      <JdDeleteModal
        targetJd={deleteTargetJd}
        deleting={deleteJd.isPending}
        onCancel={closeDeleteModal}
        onConfirm={() => void confirmDeleteJd()}
      />
      <JdChatDrawer
        apiKey={getStoredApiKey() ?? undefined}
        open={isJdChatOpen}
        selectedJd={!isCreateMode ? selectedJd : null}
        onClose={() => setIsJdChatOpen(false)}
        onRefresh={reloadData}
      />
    </div>
  );
}
