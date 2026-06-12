import { useEffect } from 'react';
import { Button, Col, Form, Row, Space } from 'antd';
import { DeleteOutlined, FileSearchOutlined, SaveOutlined } from '@ant-design/icons';
import { JdEditorPanel, type JdEditorFormValues } from '../components/jd/JdEditorPanel';
import { JdListPanel } from '../components/jd/JdListPanel';
import { EmptyState } from '../components/common/PageState';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction, ShowAlert } from '../types/app';

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
  const editorInitialValues = selectedJd ? toJdEditorValues(selectedJd) : undefined;

  useEffect(() => {
    if (selectedJd) {
      form.setFieldsValue(toJdEditorValues(selectedJd));
    }
  }, [form, selectedJd]);

  const saveSelectedJd = async () => {
    if (!selectedJd) {
      return;
    }

    const values = await form.validateFields();
    await runApiAction(
      'jd-save',
      () => apiClient.saveJobDescription({ id: Number(selectedJd.id), ...values }),
      () => void reloadData(),
    );
  };

  const deleteSelectedJd = () => {
    if (!selectedJd) {
      showAlert({ type: 'warning', message: '삭제할 JD를 선택하세요.' });
      return;
    }

    void runApiAction(
      'jd-delete',
      () => apiClient.deleteJobDescription(Number(selectedJd.id)),
      () => void reloadData(),
    );
  };

  return (
    <>
      <PageTitle
        eyebrow="JD Management"
        title="JD 관리"
        description="JD 목록과 작성 폼을 좌우로 배치해 저장, 삭제, 분석 요청 흐름을 확인합니다."
        actions={
          <Space wrap>
            <Button icon={<DeleteOutlined />} disabled={!selectedJd || loadingKey === 'jd-delete'} onClick={deleteSelectedJd}>
              삭제
            </Button>
            <Button
              icon={loadingKey === 'jd-save' ? undefined : <SaveOutlined />}
              disabled={!selectedJd || loadingKey === 'jd-save'}
              onClick={() => void saveSelectedJd()}
            >
              {loadingKey === 'jd-save' ? <InlineLoading label="저장 중" /> : '저장'}
            </Button>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              disabled={!selectedJd || loadingKey === 'jd-analysis'}
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
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={8}>
          <SectionCard title="JD 목록">
            {jdList.length ? (
              <JdListPanel jdList={jdList} selectedJdId={selectedJdId} setSelectedJdId={setSelectedJdId} />
            ) : (
              <EmptyState description="등록된 JD가 없습니다." />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard title="JD 작성/수정">
            {selectedJd && editorInitialValues ? (
              <JdEditorPanel
                form={form}
                selectedJd={selectedJd}
                initialValues={editorInitialValues}
                navigate={navigate}
              />
            ) : (
              <EmptyState description="수정할 JD를 선택하세요." />
            )}
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
