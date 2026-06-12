import { useEffect } from 'react';
import { Button, Col, Form, Row } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import {
  CoverLetterInputPanel,
  type CoverLetterInputFormValues,
} from '../components/cover-letter/CoverLetterInputPanel';
import { CoverLetterUploadPanel } from '../components/cover-letter/CoverLetterUploadPanel';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { CoverLetterDraft, CoverLetterRow, JdItem } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction } from '../types/app';

type CoverLetterPageProps = {
  jdList: JdItem[];
  selectedJdId: string | null;
  draft: CoverLetterDraft;
  coverRows: CoverLetterRow[];
  coverUploaded: boolean;
  analysisDone: boolean;
  loadingKey: string | null;
  setSelectedJdId: (id: string) => void;
  setCoverUploaded: (value: boolean) => void;
  setAnalysisDone: (value: boolean) => void;
  runApiAction: RunApiAction;
  navigate: Navigate;
  reloadData: () => Promise<void>;
};

function splitDraftBody(body: string) {
  const [question = '', ...answerParts] = body.split(/\n\s*\n/);
  return {
    question: question.trim(),
    answer: answerParts.join('\n\n').trim(),
  };
}

function toCoverLetterInitialValues(
  selectedJdId: string | null,
  draft: CoverLetterDraft,
): CoverLetterInputFormValues {
  const { question, answer } = splitDraftBody(draft.body);

  return {
    job_description_id: selectedJdId ? Number(selectedJdId) : undefined,
    name: draft.applicantName,
    skill: [],
    question,
    answer,
  };
}

export function CoverLetterPage({
  jdList,
  selectedJdId,
  draft,
  coverRows,
  coverUploaded,
  analysisDone,
  loadingKey,
  setSelectedJdId,
  setCoverUploaded,
  setAnalysisDone,
  runApiAction,
  navigate,
  reloadData,
}: CoverLetterPageProps) {
  const [form] = Form.useForm<CoverLetterInputFormValues>();
  const initialValues = toCoverLetterInitialValues(selectedJdId, draft);

  useEffect(() => {
    form.setFieldsValue(toCoverLetterInitialValues(selectedJdId, draft));
  }, [draft, form, selectedJdId]);

  const uploadCurrentResume = async () => {
    const values = await form.validateFields();
    const jobDescriptionId = values.job_description_id;

    if (!jobDescriptionId) {
      throw new Error('지원서를 저장하려면 JD를 선택해야 합니다.');
    }

    await runApiAction(
      'cover-upload',
      () =>
        apiClient.addResume({
          job_description_id: jobDescriptionId,
          name: values.name,
          skill: values.skill ?? [],
          self_intoduction: [
            {
              question: values.question,
              answer: values.answer,
            },
          ],
        }),
      () => {
        setCoverUploaded(true);
        void reloadData();
      },
    );
  };

  return (
    <>
      <PageTitle
        eyebrow="Resume"
        title="지원서 입력"
        description="Resume 컬럼 구조에 맞춰 지원자 정보와 자기소개 문항/답변 데이터를 확인합니다."
        actions={
          <Button
            type="primary"
            icon={<FileSearchOutlined />}
            disabled={!selectedJdId || loadingKey === 'cover-analysis'}
            onClick={() =>
              selectedJdId &&
              void runApiAction(
                'cover-analysis',
                () => apiClient.requestCoverLetterAnalysis(selectedJdId),
                () => {
                  setAnalysisDone(true);
                  void reloadData();
                },
              )
            }
          >
            {loadingKey === 'cover-analysis' ? <InlineLoading label="분석 중" /> : '분석 요청'}
          </Button>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={11}>
          <SectionCard title="지원서 입력">
            <CoverLetterInputPanel
              jdList={jdList}
              form={form}
              initialValues={initialValues}
              setSelectedJdId={setSelectedJdId}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={13}>
          <SectionCard title="지원서 데이터 미리보기">
            <CoverLetterUploadPanel
              draft={draft}
              coverRows={coverRows}
              coverUploaded={coverUploaded}
              analysisDone={analysisDone}
              onUpload={() => void uploadCurrentResume()}
              navigate={navigate}
            />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
