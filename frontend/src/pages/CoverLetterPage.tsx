import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Input, Row, Space } from 'antd';
import { FileSearchOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  CoverLetterInputPanel,
  type CoverLetterInputFormValues,
} from '../components/cover-letter/CoverLetterInputPanel';
import { CoverLetterDeleteModal } from '../components/cover-letter/CoverLetterDeleteModal';
import { CoverLetterUploadPanel } from '../components/cover-letter/CoverLetterUploadPanel';
import { ResumeStructuredSummary } from '../components/cover-letter/ResumeStructuredSummary';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SearchSuggestions, type SearchSuggestion } from '../components/common/SearchSuggestions';
import { SectionCard } from '../components/common/SectionCard';
import type { Resume } from '../data/backendTypes';
import type { CoverLetterRow } from '../api/adapters';
import { useCoverLetterPageData } from '../hooks/useCoverLetterPageData';
import { useResumeMutations } from '../hooks/mutations/useResumeMutations';
import type { Navigate, ShowAlert } from '../types/app';
import { pageSectionGutter } from '../utils/layout';
import {
  getSearchTextWithoutSuggestions,
  getSelectedSuggestionLabels,
  getSuggestionQueryFragment,
  toggleSuggestionInSearchText,
} from '../utils/searchSuggestions';
import { toTrimmedStringList } from '../utils/stringList';

type CoverLetterPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

const COVER_SEARCH_SUGGESTIONS = [
  { label: '분석 대기', keywords: ['대기', 'onqueue'] },
  { label: '분석 중', keywords: ['처리', 'processing'] },
  { label: '분석 완료', keywords: ['완료', 'done'] },
  { label: '미검토', keywords: ['검토 전', 'unreviewed'] },
  { label: '검토 완료', keywords: ['검토됨', 'reviewed'] },
] satisfies SearchSuggestion[];

const COVER_ANALYSIS_STATUS_SUGGESTIONS = ['분석 대기', '분석 중', '분석 완료'];
const COVER_REVIEW_STATUS_SUGGESTIONS = ['미검토', '검토 완료'];

function normalizeSearchText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function includesSearchText(values: unknown[], query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

function compareRecent(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
}

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

function matchesCoverSuggestion(row: CoverLetterRow, suggestion: string) {
  if (suggestion === '분석 대기') {
    return row.resumeStatus === 'onqueue' || row.statusCode === 'onqueue' || normalizeSearchText(row.status) === suggestion;
  }

  if (suggestion === '분석 중') {
    return row.resumeStatus === 'processing' || row.statusCode === 'processing' || normalizeSearchText(row.status) === suggestion;
  }

  if (suggestion === '분석 완료') {
    return row.resumeStatus === 'done' || row.statusCode === 'done' || normalizeSearchText(row.status) === suggestion;
  }

  if (suggestion === '미검토') {
    return !row.reviewed;
  }

  if (suggestion === '검토 완료') {
    return row.reviewed;
  }

  return true;
}

function matchesCoverSuggestionFilters(row: CoverLetterRow, selectedSuggestions: string[]) {
  const analysisSelections = selectedSuggestions.filter((suggestion) =>
    COVER_ANALYSIS_STATUS_SUGGESTIONS.includes(suggestion),
  );
  const reviewSelections = selectedSuggestions.filter((suggestion) =>
    COVER_REVIEW_STATUS_SUGGESTIONS.includes(suggestion),
  );
  const matchesAnalysis =
    !analysisSelections.length || analysisSelections.some((suggestion) => matchesCoverSuggestion(row, suggestion));
  const matchesReview =
    !reviewSelections.length || reviewSelections.some((suggestion) => matchesCoverSuggestion(row, suggestion));

  return matchesAnalysis && matchesReview;
}

function matchesCoverTextSearch(row: CoverLetterRow, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return includesSearchText(
    [
      row.applicant,
      row.jd,
      row.skills.join(' '),
      row.status,
      row.statusCode,
      row.resumeStatus,
      row.reviewed ? '검토 완료' : '미검토',
      row.score,
    ],
    query,
  );
}

function toStringArray(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function toEducationSummary(value: Record<string, unknown> | undefined) {
  if (!value || !Object.keys(value).length) {
    return '';
  }

  const summary = value.summary;
  if (typeof summary === 'string') {
    return summary;
  }

  return Object.entries(value)
    .map(([key, nextValue]) => `${key}: ${String(nextValue)}`)
    .join(', ');
}

function toCoverLetterInitialValues(
  selectedJdId: string | null,
  currentResume: Resume | null,
): CoverLetterInputFormValues {
  const intro = getSelfIntroduction(currentResume);

  return {
    job_description_id: currentResume?.job_description_id ?? (selectedJdId ? Number(selectedJdId) : undefined),
    name: currentResume?.name ?? '',
    skill: toStringArray(currentResume?.skill),
    education_level_text: toEducationSummary(currentResume?.education_level),
    experience: toStringArray(currentResume?.experience),
    question: intro.question,
    answer: intro.answer,
    certification: toStringArray(currentResume?.certification),
    language: toStringArray(currentResume?.language),
    award: toStringArray(currentResume?.award),
    training: toStringArray(currentResume?.training),
    other_activity: toStringArray(currentResume?.other_activity),
  };
}

function toEmptyCoverLetterValues(selectedJdId: string | null): CoverLetterInputFormValues {
  return {
    job_description_id: selectedJdId ? Number(selectedJdId) : undefined,
    name: '',
    skill: [],
    education_level_text: '',
    experience: [],
    question: '',
    answer: '',
    certification: [],
    language: [],
    award: [],
    training: [],
    other_activity: [],
  };
}

export function CoverLetterPage({ navigate, showAlert }: CoverLetterPageProps) {
  const [form] = Form.useForm<CoverLetterInputFormValues>();
  const [isCreatingCoverLetter, setIsCreatingCoverLetter] = useState(false);
  const [deleteTargetResume, setDeleteTargetResume] = useState<CoverLetterRow | null>(null);
  const [coverSearchText, setCoverSearchText] = useState('');
  const { coverRows, jdList, resumes, selectedJdId, selectedResumeId, setSelectedJdId, setSelectedResumeId } =
    useCoverLetterPageData();
  const { addResume, analyzeResume, deleteResume, saveResume } = useResumeMutations(showAlert);
  const currentResume = useMemo(
    () => resumes.find((resume) => String(resume.id) === selectedResumeId) ?? null,
    [resumes, selectedResumeId],
  );
  const editingResume = isCreatingCoverLetter ? null : currentResume;
  const initialValues = useMemo(
    () =>
      isCreatingCoverLetter
        ? toEmptyCoverLetterValues(selectedJdId)
        : toCoverLetterInitialValues(selectedJdId, editingResume),
    [editingResume, isCreatingCoverLetter, selectedJdId],
  );
  const hasCurrentResume = Boolean(editingResume);
  const isEditMode = Boolean(editingResume);
  const canAnalyze = Boolean(editingResume && !isCreatingCoverLetter);
  const analysisDone = editingResume?.status === 'done';
  const selectedCoverSuggestions = useMemo(
    () => getSelectedSuggestionLabels(coverSearchText, COVER_SEARCH_SUGGESTIONS),
    [coverSearchText],
  );
  const coverTextSearch = useMemo(
    () => getSearchTextWithoutSuggestions(coverSearchText, COVER_SEARCH_SUGGESTIONS),
    [coverSearchText],
  );
  const coverSuggestionQuery = useMemo(() => getSuggestionQueryFragment(coverSearchText), [coverSearchText]);
  const filteredCoverRows = useMemo(() => {
    const filtered = coverRows.filter(
      (row) =>
        matchesCoverSuggestionFilters(row, selectedCoverSuggestions) && matchesCoverTextSearch(row, coverTextSearch),
    );

    return [...filtered].sort((left, right) => compareRecent(left.updatedAtIso, right.updatedAtIso));
  }, [coverRows, coverTextSearch, selectedCoverSuggestions]);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  const startCreateCoverLetter = () => {
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
      } else {
        setSelectedResumeId(null);
        setIsCreatingCoverLetter(true);
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

    const payload = {
      name: values.name,
      skill: toTrimmedStringList(allValues.skill ?? values.skill ?? []),
      education_level: values.education_level_text ? { summary: values.education_level_text } : {},
      experience: toTrimmedStringList(allValues.experience ?? values.experience ?? []),
      self_intoduction: [
        {
          question: values.question,
          answer: values.answer,
        },
      ],
      certification: toTrimmedStringList(allValues.certification ?? values.certification ?? []),
      language: toTrimmedStringList(allValues.language ?? values.language ?? []),
      award: toTrimmedStringList(allValues.award ?? values.award ?? []),
      training: toTrimmedStringList(allValues.training ?? values.training ?? []),
      other_activity: toTrimmedStringList(allValues.other_activity ?? values.other_activity ?? []),
    };

    if (editingResume) {
      const response = await saveResume.mutateAsync({ id: editingResume.id, ...payload });
      setSelectedResumeId(String(response.data.id));
    } else {
      const response = await addResume.mutateAsync({ job_description_id: jobDescriptionId, ...payload });
      setSelectedResumeId(String(response.data.id));
      setSelectedJdId(String(response.data.job_description_id));
    }

    setIsCreatingCoverLetter(false);
  };

  const requestAnalysis = async () => {
    if (!editingResume) {
      return;
    }

    const response = await analyzeResume.mutateAsync(editingResume.id);
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
              analysisDone={analysisDone}
              navigate={navigate}
              selectedResumeId={isCreatingCoverLetter ? null : selectedResumeId}
              onSelectResume={selectResume}
              onDeleteResume={requestDeleteResume}
              emptyDescription={coverRows.length ? '조건에 맞는 자소서가 없습니다.' : undefined}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard className="scroll-card-body" title="자소서 작성/수정">
            <ResumeStructuredSummary resume={editingResume} />
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
      <CoverLetterDeleteModal
        targetResume={deleteTargetResume}
        deleting={deleteResume.isPending}
        onCancel={closeDeleteResumeModal}
        onConfirm={() => void confirmDeleteResume()}
      />
    </div>
  );
}
