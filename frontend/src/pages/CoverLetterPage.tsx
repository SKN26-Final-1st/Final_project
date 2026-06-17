import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Row, Space } from 'antd';
import { FileSearchOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  CoverLetterInputPanel,
  type CoverLetterInputFormValues,
} from '../components/cover-letter/CoverLetterInputPanel';
import { CoverLetterUploadPanel } from '../components/cover-letter/CoverLetterUploadPanel';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { Resume } from '../data/backendTypes';
import { useCoverLetterPageData } from '../hooks/useCoverLetterPageData';
import { useResumeMutations } from '../hooks/mutations/useResumeMutations';
import type { Navigate, ShowAlert } from '../types/app';
import { pageSectionGutter } from '../utils/layout';

type CoverLetterPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

function getSelfIntroduction(resume: Resume | null) {
  const [firstIntro] = Array.isArray(resume?.self_intoduction) ? resume.self_intoduction : [];

  if (firstIntro && typeof firstIntro === 'object' && !Array.isArray(firstIntro)) {
    const intro = firstIntro as Record<string, unknown>;
    return {
      question: typeof intro.question === 'string' ? intro.question : '',
      answer: typeof intro.answer === 'string' ? intro.answer : '',
    };
  }

  if (typeof firstIntro === 'string') {
    const [question = '', ...answerParts] = firstIntro.split(/\n\s*\n/);
    return {
      question: question.trim(),
      answer: answerParts.join('\n\n').trim(),
    };
  }

  return { question: '', answer: '' };
}

function toStringArray(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function toCoverLetterInitialValues(
  selectedJdId: string | null,
  currentResume: Resume | null,
): CoverLetterInputFormValues {
  const intro = getSelfIntroduction(currentResume);

  return {
    job_description_id: selectedJdId ? Number(selectedJdId) : currentResume?.job_description_id,
    name: currentResume?.name ?? '',
    skill: toStringArray(currentResume?.skill),
    question: intro.question,
    answer: intro.answer,
  };
}

function toEmptyCoverLetterValues(selectedJdId: string | null): CoverLetterInputFormValues {
  return {
    job_description_id: selectedJdId ? Number(selectedJdId) : undefined,
    name: '',
    skill: [],
    question: '',
    answer: '',
  };
}

export function CoverLetterPage({ navigate, showAlert }: CoverLetterPageProps) {
  const [form] = Form.useForm<CoverLetterInputFormValues>();
  const [isCreatingCoverLetter, setIsCreatingCoverLetter] = useState(false);
  const { coverRows, jdList, resumes, selectedJdId, setSelectedJdId } = useCoverLetterPageData();
  const { addResume, analyzeResume, saveResume } = useResumeMutations(showAlert);
  const currentResume = useMemo(
    () => resumes.find((resume) => String(resume.job_description_id) === selectedJdId) ?? null,
    [resumes, selectedJdId],
  );
  const editingResume = isCreatingCoverLetter ? null : currentResume;
  const initialValues = useMemo(
    () =>
      isCreatingCoverLetter
        ? toEmptyCoverLetterValues(selectedJdId)
        : toCoverLetterInitialValues(selectedJdId, editingResume),
    [editingResume, isCreatingCoverLetter, selectedJdId],
  );
  const hasCurrentResume = Boolean(currentResume);
  const isEditMode = Boolean(editingResume);
  const canAnalyze = Boolean(selectedJdId && currentResume && !isCreatingCoverLetter);
  const analysisDone = currentResume?.status === 'done';

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  const startCreateCoverLetter = () => {
    setIsCreatingCoverLetter(true);
    form.setFieldsValue(toEmptyCoverLetterValues(selectedJdId));
  };

  const saveCurrentResume = async () => {
    const values = await form.validateFields();
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

    const payload = {
      name: values.name,
      skill: values.skill ?? [],
      self_intoduction: [
        {
          question: values.question,
          answer: values.answer,
        },
      ],
    };

    if (editingResume) {
      await saveResume.mutateAsync({ id: editingResume.id, ...payload });
    } else {
      await addResume.mutateAsync({ job_description_id: jobDescriptionId, ...payload });
    }

    setIsCreatingCoverLetter(false);
  };

  const requestAnalysis = async () => {
    if (!currentResume) {
      return;
    }

    const response = await analyzeResume.mutateAsync(currentResume.id);
    navigate(`/analysis-report?resumeId=${response.data.report.resume_id || response.data.resume_id}`);
  };

  return (
    <div className="cover-letter-page viewport-page">
      <PageTitle
        eyebrow="Resume"
        title="자소서 관리"
        description="저장된 자소서를 확인하고, 선택한 JD에 맞춰 작성/수정 후 분석 요청을 진행합니다."
        actions={
          <Space wrap>
            <Button icon={<SaveOutlined />} loading={saveResume.isPending || addResume.isPending} onClick={() => void saveCurrentResume()}>
              저장
            </Button>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              disabled={!canAnalyze || analyzeResume.isPending}
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
              <Button size="small" icon={<PlusOutlined />} onClick={startCreateCoverLetter}>
                새 자소서 작성
              </Button>
            }
          >
            <CoverLetterUploadPanel
              coverRows={coverRows}
              hasSavedResume={hasCurrentResume}
              analysisDone={analysisDone}
              navigate={navigate}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard className="scroll-card-body" title="자소서 작성/수정">
            <CoverLetterInputPanel
              jdList={jdList}
              form={form}
              initialValues={initialValues}
              mode={isEditMode ? 'edit' : 'create'}
              setSelectedJdId={setSelectedJdId}
            />
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
