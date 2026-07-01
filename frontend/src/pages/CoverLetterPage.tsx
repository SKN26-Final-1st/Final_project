import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Input, Row, Space } from 'antd';
import { FileSearchOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  CoverLetterInputPanel,
  type CoverLetterInputFormValues,
  type AwardFormValue,
  type EducationDegree,
  type EducationLevelFormValue,
  type ExperienceFormValue,
  type LanguageFormValue,
  type OtherActivityFormValue,
  type SelfIntroductionFormValue,
  type TrainingFormValue,
} from '../components/cover-letter/CoverLetterInputPanel';
import { CoverLetterDeleteModal } from '../components/cover-letter/CoverLetterDeleteModal';
import { CoverLetterUploadPanel } from '../components/cover-letter/CoverLetterUploadPanel';
import { InlineLoading } from '../components/common/InlineLoading';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SearchSuggestions, type SearchSuggestion } from '../components/common/SearchSuggestions';
import { SectionCard } from '../components/common/SectionCard';
import type { Resume } from '../data/backendTypes';
import type { CoverLetterRow } from '../api/adapters';
import { useCoverLetterPageData } from '../hooks/useCoverLetterPageData';
import { useJdChecklist } from '../hooks/useJdChecklist';
import { useResumeMutations } from '../hooks/mutations/useResumeMutations';
import type { Navigate, ShowAlert } from '../types/app';
import { getStoredApiKey } from '../utils/apiKeySession';
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
const VALID_DEGREES = new Set<EducationDegree>(['', 'bachelor', 'master', 'doctoral']);
const EMPTY_EDUCATION_LEVEL: EducationLevelFormValue = {
  final_degree: '',
  bachelor: '',
  master: '',
  doctoral: '',
};
const EXPERIENCE_KEYS = ['company_name', 'length', 'position', 'experience_description'] as const;
const SELF_INTRODUCTION_KEYS = ['question', 'answer'] as const;
const LANGUAGE_KEYS = ['language_name', 'test_name', 'score'] as const;
const AWARD_KEYS = ['award_name', 'award_from', 'time'] as const;
const TRAINING_KEYS = ['education_name', 'education_from', 'education_description', 'start', 'end'] as const;
const OTHER_ACTIVITY_KEYS = ['activity_name', 'activity_description', 'start', 'end'] as const;

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

function toCleanString(value: unknown) {
  return String(value ?? '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasAnyRecordValue(value: Record<string, string>) {
  return Object.values(value).some((item) => item.trim());
}

function normalizeDegree(value: unknown): EducationDegree {
  const degree = toCleanString(value) as EducationDegree;
  return VALID_DEGREES.has(degree) ? degree : '';
}

function normalizeRecord<T extends Record<string, string>>(
  value: unknown,
  keys: readonly (keyof T & string)[],
): T {
  const record = isRecord(value) ? value : {};

  return keys.reduce((result, key) => {
    result[key] = toCleanString(record[key]) as T[keyof T & string];
    return result;
  }, {} as T);
}

function normalizeEducationLevel(value: Record<string, unknown> | undefined): EducationLevelFormValue {
  const record = isRecord(value) ? value : {};
  const normalized: EducationLevelFormValue = {
    final_degree: normalizeDegree(record.final_degree),
    bachelor: toCleanString(record.bachelor),
    master: toCleanString(record.master),
    doctoral: toCleanString(record.doctoral),
  };
  const summary = toCleanString(record.summary);

  return summary ? { ...normalized, summary } : normalized;
}

function normalizeObjectList<T extends Record<string, string>>(
  value: unknown[] | undefined,
  keys: readonly (keyof T & string)[],
  legacyFactory: (text: string) => T,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (isRecord(item) ? normalizeRecord<T>(item, keys) : legacyFactory(toCleanString(item))))
    .filter(hasAnyRecordValue);
}

function normalizeSelfIntroductions(value: unknown[] | undefined): SelfIntroductionFormValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (isRecord(item)) {
        return normalizeRecord<SelfIntroductionFormValue>(item, SELF_INTRODUCTION_KEYS);
      }

      const text = toCleanString(item);
      const [question = '', ...answerParts] = text.split(/\n\s*\n/);
      return {
        question: question.trim(),
        answer: answerParts.join('\n\n').trim(),
      };
    })
    .filter(hasAnyRecordValue);
}

function cleanObjectList<T extends Record<string, string>>(
  value: T[] | undefined,
  keys: readonly (keyof T & string)[],
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeRecord<T>(item, keys)).filter(hasAnyRecordValue);
}

function cleanEducationLevel(value: EducationLevelFormValue | undefined): EducationLevelFormValue {
  const normalized = normalizeEducationLevel(value as Record<string, unknown> | undefined);
  const summary = toCleanString(normalized.summary);

  return summary ? { ...normalized, summary } : normalized;
}

function withDefaultSelfIntroduction(value: SelfIntroductionFormValue[]) {
  return value.length ? value : [{ question: '', answer: '' }];
}

function toCoverLetterInitialValues(
  selectedJdId: string | null,
  currentResume: Resume | null,
): CoverLetterInputFormValues {
  return {
    job_description_id: currentResume?.job_description_id ?? (selectedJdId ? Number(selectedJdId) : undefined),
    name: currentResume?.name ?? '',
    skill: toStringArray(currentResume?.skill),
    education_level: normalizeEducationLevel(currentResume?.education_level),
    experience: normalizeObjectList<ExperienceFormValue>(currentResume?.experience, EXPERIENCE_KEYS, (text) => ({
      company_name: '',
      length: '',
      position: '',
      experience_description: text,
    })),
    self_intoduction: withDefaultSelfIntroduction(normalizeSelfIntroductions(currentResume?.self_intoduction)),
    certification: toStringArray(currentResume?.certification),
    language: normalizeObjectList<LanguageFormValue>(currentResume?.language, LANGUAGE_KEYS, (text) => ({
      language_name: text,
      test_name: '',
      score: '',
    })),
    award: normalizeObjectList<AwardFormValue>(currentResume?.award, AWARD_KEYS, (text) => ({
      award_name: text,
      award_from: '',
      time: '',
    })),
    training: normalizeObjectList<TrainingFormValue>(currentResume?.training, TRAINING_KEYS, (text) => ({
      education_name: text,
      education_from: '',
      education_description: '',
      start: '',
      end: '',
    })),
    other_activity: normalizeObjectList<OtherActivityFormValue>(
      currentResume?.other_activity,
      OTHER_ACTIVITY_KEYS,
      (text) => ({
        activity_name: text,
        activity_description: '',
        start: '',
        end: '',
      }),
    ),
  };
}

function toEmptyCoverLetterValues(selectedJdId: string | null): CoverLetterInputFormValues {
  return {
    job_description_id: selectedJdId ? Number(selectedJdId) : undefined,
    name: '',
    skill: [],
    education_level: { ...EMPTY_EDUCATION_LEVEL },
    experience: [],
    self_intoduction: [{ question: '', answer: '' }],
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
  const isApiKeyMode = Boolean(getStoredApiKey());
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
  const canAnalyze = Boolean(editingResume && !isCreatingCoverLetter && !checklistAnalysisDisabledReason);
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

    const payload = {
      name: values.name,
      skill: toTrimmedStringList(allValues.skill ?? values.skill ?? []),
      education_level: cleanEducationLevel(allValues.education_level ?? values.education_level),
      experience: cleanObjectList<ExperienceFormValue>(allValues.experience ?? values.experience, EXPERIENCE_KEYS),
      self_intoduction: cleanObjectList<SelfIntroductionFormValue>(
        allValues.self_intoduction ?? values.self_intoduction,
        SELF_INTRODUCTION_KEYS,
      ),
      certification: toTrimmedStringList(allValues.certification ?? values.certification ?? []),
      language: cleanObjectList<LanguageFormValue>(allValues.language ?? values.language, LANGUAGE_KEYS),
      award: cleanObjectList<AwardFormValue>(allValues.award ?? values.award, AWARD_KEYS),
      training: cleanObjectList<TrainingFormValue>(allValues.training ?? values.training, TRAINING_KEYS),
      other_activity: cleanObjectList<OtherActivityFormValue>(
        allValues.other_activity ?? values.other_activity,
        OTHER_ACTIVITY_KEYS,
      ),
    };

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
    if (!editingResume || checklistAnalysisDisabledReason) {
      if (checklistAnalysisDisabledReason) {
        showAlert({ type: 'warning', message: checklistAnalysisDisabledReason });
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
              title={checklistAnalysisDisabledReason}
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
