import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Row, Space } from 'antd';
import { FileSearchOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { JdDeleteModal } from '../components/jd/JdDeleteModal';
import { JdEditorPanel, type JdEditorFormValues } from '../components/jd/JdEditorPanel';
import { JdListEmptyState } from '../components/jd/JdListEmptyState';
import { JdListPanel } from '../components/jd/JdListPanel';
import { EmptyState } from '../components/common/PageState';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction, ShowAlert } from '../types/app';
import { pageSectionGutter } from '../utils/layout';

type JdPageProps = {
  jdList: JdItem[];
  selectedJdId: string | null;
  selectedJd: JdItem | null;
  loadingKey: string | null;
  setSelectedJdId: (id: string) => void;
  runApiAction: RunApiAction;
  navigate: Navigate;
  showAlert: ShowAlert;
  reloadData: () => Promise<void>;
};

function toJdEditorValues(selectedJd: JdItem): JdEditorFormValues {
  const validStatus = ['prepare', 'on_going', 'closed'].includes(selectedJd.statusCode)
    ? (selectedJd.statusCode as JdEditorFormValues['status'])
    : 'prepare';

  return {
    job_name: selectedJd.title,
    education_level: selectedJd.educationLevel,
    major: selectedJd.major,
    career_level: selectedJd.requiredExperience,
    required_skill: selectedJd.stack,
    preferred_skill: selectedJd.preferredStack,
    main_task: selectedJd.summary,
    hiring_reason: selectedJd.hiringReason,
    work_type: selectedJd.employmentType,
    status: validStatus,
  };
}

const EMPTY_JD_EDITOR_VALUES: JdEditorFormValues = {
  job_name: '',
  education_level: '',
  major: '',
  career_level: '',
  required_skill: [],
  preferred_skill: [],
  main_task: '',
  hiring_reason: '',
  work_type: '',
  status: 'prepare',
};

export function JdPage({
  jdList,
  selectedJdId,
  selectedJd,
  loadingKey,
  setSelectedJdId,
  runApiAction,
  navigate,
  showAlert,
  reloadData,
}: JdPageProps) {
  const [form] = Form.useForm<JdEditorFormValues>();
  const [isCreatingJd, setIsCreatingJd] = useState(false);
  const [deleteTargetJd, setDeleteTargetJd] = useState<JdItem | null>(null);
  const isEmptyJdList = jdList.length === 0;
  const isCreateMode = isCreatingJd || isEmptyJdList;
  const editorInitialValues = useMemo(
    () => (isCreateMode ? EMPTY_JD_EDITOR_VALUES : selectedJd ? toJdEditorValues(selectedJd) : undefined),
    [isCreateMode, selectedJd],
  );
  const showEditor = isCreateMode || Boolean(selectedJd && editorInitialValues);
  const deleteLoadingKey = deleteTargetJd ? `jd-delete-${deleteTargetJd.id}` : null;
  const isDeletingJd = Boolean(deleteLoadingKey && loadingKey === deleteLoadingKey);

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

    if (isCreateMode) {
      await runApiAction(
        'jd-add',
        () => apiClient.addJobDescription(values),
        (response) => {
          setIsCreatingJd(false);
          setSelectedJdId(String(response.data.id));
          void reloadData();
        },
      );
      return;
    }

    if (!selectedJd) {
      return;
    }

    await runApiAction(
      'jd-save',
      () => apiClient.saveJobDescription({ id: Number(selectedJd.id), ...values }),
      () => void reloadData(),
    );
  };

  const requestDeleteJd = (id: string) => {
    const targetJd = jdList.find((item) => item.id === id);

    if (!targetJd) {
      showAlert({ type: 'warning', message: '삭제할 JD를 찾을 수 없습니다.' });
      return;
    }

    setDeleteTargetJd(targetJd);
  };

  const closeDeleteModal = () => {
    if (!isDeletingJd) {
      setDeleteTargetJd(null);
    }
  };

  const confirmDeleteJd = async () => {
    if (!deleteTargetJd) {
      return;
    }

    const targetId = deleteTargetJd.id;

    await runApiAction(
      `jd-delete-${targetId}`,
      () => apiClient.deleteJobDescription(Number(targetId)),
      () => {
        setDeleteTargetJd(null);

        if (selectedJdId === targetId) {
          const nextJd = jdList.find((item) => item.id !== targetId);

          if (nextJd) {
            setSelectedJdId(nextJd.id);
          } else {
            startCreateJd();
          }
        }

        void reloadData();
      },
    );
  };

  return (
    <div className="jd-page">
      <PageTitle
        eyebrow="JD Management"
        title="JD 관리"
        description="JD 목록과 작성 폼을 좌우로 배치해 저장, 삭제, 분석 요청 흐름을 확인합니다."
        actions={
          <Space wrap>
            <Button
              icon={loadingKey === 'jd-save' || loadingKey === 'jd-add' ? undefined : <SaveOutlined />}
              disabled={!showEditor || loadingKey === 'jd-save' || loadingKey === 'jd-add'}
              onClick={() => void saveSelectedJd()}
            >
              {loadingKey === 'jd-save' || loadingKey === 'jd-add' ? (
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
              disabled={isCreateMode || !selectedJd || loadingKey === 'jd-analysis'}
              onClick={() =>
                selectedJd &&
                void runApiAction(
                  'jd-analysis',
                  () => apiClient.requestJobAnalysis(selectedJd.id),
                  () => {
                    void reloadData().finally(() => navigate('/cover-letter'));
                  },
                )
              }
            >
              {loadingKey === 'jd-analysis' ? <InlineLoading label="분석 중" /> : '분석 요청'}
            </Button>
          </Space>
        }
      />
      <Row className="section-row split-editor-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={8}>
          <SectionCard
            title="JD 목록"
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={startCreateJd}>
                새 JD 작성
              </Button>
            }
          >
            {jdList.length ? (
              <JdListPanel
                jdList={jdList}
                selectedJdId={isCreateMode ? null : selectedJdId}
                setSelectedJdId={selectExistingJd}
                onDeleteJd={requestDeleteJd}
              />
            ) : (
              <JdListEmptyState />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard title="JD 작성/수정">
            {showEditor && editorInitialValues ? (
              <JdEditorPanel
                form={form}
                selectedJd={isCreateMode ? null : selectedJd}
                initialValues={editorInitialValues}
                navigate={navigate}
                mode={isCreateMode ? 'create' : 'edit'}
              />
            ) : (
              <EmptyState description="수정할 JD를 선택하거나 JD 목록에서 새 작성을 시작하세요." />
            )}
          </SectionCard>
        </Col>
      </Row>
      <JdDeleteModal
        targetJd={deleteTargetJd}
        deleting={isDeletingJd}
        onCancel={closeDeleteModal}
        onConfirm={() => void confirmDeleteJd()}
      />
    </div>
  );
}
