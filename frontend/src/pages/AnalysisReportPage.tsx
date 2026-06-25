import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Input, Row, Space, Tabs, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, MessageOutlined, SaveOutlined } from '@ant-design/icons';
import { apiClient } from '../api/backendClient';
import { CompactTextList } from '../components/common/CompactTextList';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SearchSuggestions, type SearchSuggestion } from '../components/common/SearchSuggestions';
import { SectionCard } from '../components/common/SectionCard';
import type { AnalysisReport, InterviewQuestion } from '../data/backendTypes';
import { useAnalysisReportPageData, type AnalysisReportItem } from '../hooks/useAnalysisReportPageData';
import type { Navigate } from '../types/app';
import { pageSectionGutter } from '../utils/layout';
import {
  getSearchTextWithoutSuggestions,
  getSelectedSuggestionLabels,
  getSuggestionQueryFragment,
  toggleSuggestionInSearchText,
} from '../utils/searchSuggestions';

type AnalysisReportPageProps = {
  navigate: Navigate;
};

type ReportEditFormValues = {
  overall_grade: string;
  overall_summary: string;
  candidate_summary: string;
  competency_analysis: string;
  fit_analysis: string;
  motive: string;
  collaboration: string;
  strength: string;
  concern: string;
  check_point: string;
  final_comment: string;
};

const REPORT_SEARCH_SUGGESTIONS = [
  { label: 'A/B 등급', keywords: ['등급', '상위', '우수'] },
  { label: 'C 이하', keywords: ['등급', '낮은 등급', 'c등급', 'd등급', 'f등급'] },
  { label: '질문 있음', keywords: ['면접 질문', 'interview'] },
  { label: '확인 포인트 있음', keywords: ['확인', '체크 포인트', 'check point'] },
  { label: '우려사항 있음', keywords: ['우려', '검증 필요', 'concern'] },
] satisfies SearchSuggestion[];

const REPORT_GRADE_SUGGESTIONS = ['A/B 등급', 'C 이하'];
const REPORT_CONTENT_SUGGESTIONS = ['질문 있음', '확인 포인트 있음', '우려사항 있음'];

const REPORT_STATUS_LABEL: Record<AnalysisReport['status'], string> = {
  onqueue: '분석 대기',
  processing: '분석 중',
  done: '분석 완료',
};

const GRADE_SCORE: Record<string, number> = {
  A: 94,
  B: 82,
  C: 68,
  D: 46,
  F: 20,
};

function toDisplayText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const text = toDisplayText(value).trim();
  return text ? [text] : [];
}

function toTextareaValue(value: unknown) {
  return toList(value).join('\n');
}

function toTextareaList(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function gradeScore(grade: string) {
  return GRADE_SCORE[grade.toUpperCase()] ?? 0;
}

function isReportPending(report: AnalysisReport) {
  return report.status === 'onqueue' || report.status === 'processing';
}

function reportListTag(report: AnalysisReport) {
  if (isReportPending(report)) {
    return <Tag color={report.status === 'processing' ? 'processing' : 'warning'}>{REPORT_STATUS_LABEL[report.status]}</Tag>;
  }

  return <Tag>{report.overall_grade || 'N/A'} 등급</Tag>;
}

function formatReportTimestamp(value: string) {
  if (!value) {
    return '생성일 없음';
  }

  const [date = '', time = ''] = value.split('T');
  const normalizedTime = time.slice(0, 5);

  return [date, normalizedTime].filter(Boolean).join(' ');
}

function reportEditInitialValues(report: AnalysisReport): ReportEditFormValues {
  return {
    overall_grade: report.overall_grade,
    overall_summary: report.overall_summary,
    candidate_summary: report.candidate_summary,
    competency_analysis: toTextareaValue(report.competency_analysis),
    fit_analysis: toTextareaValue(report.fit_analysis),
    motive: toTextareaValue(report.motive),
    collaboration: toTextareaValue(report.collaboration),
    strength: toTextareaValue(report.strength),
    concern: toTextareaValue(report.concern),
    check_point: toTextareaValue(report.check_point),
    final_comment: report.final_comment,
  };
}

function reportEditPayload(id: number, values: ReportEditFormValues) {
  return {
    id,
    overall_grade: values.overall_grade.trim(),
    overall_summary: values.overall_summary.trim(),
    candidate_summary: values.candidate_summary.trim(),
    competency_analysis: toTextareaList(values.competency_analysis),
    fit_analysis: values.fit_analysis.trim(),
    motive: values.motive.trim(),
    collaboration: values.collaboration.trim(),
    strength: toTextareaList(values.strength),
    concern: toTextareaList(values.concern),
    check_point: toTextareaList(values.check_point),
    final_comment: values.final_comment.trim(),
  };
}

function hasListContent(value: unknown) {
  return toList(value).length > 0;
}

function matchesReportSuggestion(
  item: AnalysisReportItem,
  suggestion: string,
) {
  const grade = item.report.overall_grade.toUpperCase();

  if (suggestion === 'A/B 등급') {
    return grade === 'A' || grade === 'B';
  }

  if (suggestion === 'C 이하') {
    return ['C', 'D', 'F'].includes(grade);
  }

  if (suggestion === '질문 있음') {
    return item.questions.length > 0 || item.report.interview_question.length > 0;
  }

  if (suggestion === '확인 포인트 있음') {
    return hasListContent(item.report.check_point);
  }

  if (suggestion === '우려사항 있음') {
    return hasListContent(item.report.concern);
  }

  return true;
}

function matchesReportSuggestionFilters(
  item: AnalysisReportItem,
  selectedSuggestions: string[],
) {
  const gradeSelections = selectedSuggestions.filter((suggestion) => REPORT_GRADE_SUGGESTIONS.includes(suggestion));
  const contentSelections = selectedSuggestions.filter((suggestion) =>
    REPORT_CONTENT_SUGGESTIONS.includes(suggestion),
  );
  const matchesGrade =
    !gradeSelections.length || gradeSelections.some((suggestion) => matchesReportSuggestion(item, suggestion));
  const matchesContent = contentSelections.every((suggestion) => matchesReportSuggestion(item, suggestion));

  return matchesGrade && matchesContent;
}

function checklistItems(report: AnalysisReport) {
  return Array.isArray(report.checklist)
    ? report.checklist
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const record = item as Record<string, unknown>;
          const content = toDisplayText(record.content);
          if (!content) return null;
          return { content, result: Boolean(record.result) };
        })
        .filter((item): item is { content: string; result: boolean } => Boolean(item))
    : [];
}

function questionKey(question: InterviewQuestion, index: number) {
  return String(question.id ?? `${question.question}-${index}`);
}

function CompactQuestionList({ questions }: { questions: InterviewQuestion[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState(() => (questions[0] ? questionKey(questions[0], 0) : ''));
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (!questions.length) {
    return <p className="muted">추천 면접 질문이 없습니다.</p>;
  }

  const visibleQuestions = isExpanded ? questions : questions.slice(0, 3);
  const hiddenCount = Math.max(questions.length - visibleQuestions.length, 0);
  const selectedVisibleIndex = visibleQuestions.findIndex(
    (question, index) => questionKey(question, index) === selectedKey,
  );
  const effectiveSelectedIndex = selectedVisibleIndex >= 0 ? selectedVisibleIndex : 0;
  const selectedQuestion = visibleQuestions[effectiveSelectedIndex];

  return (
    <div className="analysis-report-question-compact">
      <div className="analysis-report-question-list">
        {visibleQuestions.map((item, index) => {
          const key = questionKey(item, index);
          const active = index === effectiveSelectedIndex;

          return (
            <button
              className={`analysis-report-question ${active ? 'active' : ''}`}
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setSelectedKey(key);
                setIsDetailOpen(false);
              }}
            >
              <span>질문</span>
              <strong>{item.question}</strong>
            </button>
          );
        })}
      </div>
      {questions.length > 3 ? (
        <Button
          className="compact-text-list-toggle"
          size="small"
          type="link"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? '접기' : `전체 보기 (+${hiddenCount})`}
        </Button>
      ) : null}
      <div className="analysis-report-question-detail">
        <Button size="small" onClick={() => setIsDetailOpen((current) => !current)}>
          {isDetailOpen ? '상세 닫기' : '상세 보기'}
        </Button>
        {isDetailOpen ? (
          <div className="analysis-report-question-detail-body">
            <span>예상 / 모범 답변</span>
            <p>{selectedQuestion.answer || '답변이 없습니다.'}</p>
            <span>질문 의도</span>
            <p>{selectedQuestion.purpose || '질문 의도가 없습니다.'}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AnalysisReportPage({ navigate }: AnalysisReportPageProps) {
  const { refreshing, reloadData, reportItems, reportTreeItems, selectedReportId, setSelectedReportId } =
    useAnalysisReportPageData();
  const [reportForm] = Form.useForm<ReportEditFormValues>();
  const [reportSearchText, setReportSearchText] = useState('');
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const selectedReportSuggestions = useMemo(
    () => getSelectedSuggestionLabels(reportSearchText, REPORT_SEARCH_SUGGESTIONS),
    [reportSearchText],
  );
  const reportTextSearch = useMemo(
    () => getSearchTextWithoutSuggestions(reportSearchText, REPORT_SEARCH_SUGGESTIONS),
    [reportSearchText],
  );
  const reportSuggestionQuery = useMemo(() => getSuggestionQueryFragment(reportSearchText), [reportSearchText]);
  const filteredReportItems = useMemo(() => {
    const filtered = reportItems.filter((item) => {
      const questionText = item.questions
        .map((question) => [question.question, question.answer, question.purpose].join(' '))
        .join(' ');
      const report = item.report;
      const matchesSuggestions = matchesReportSuggestionFilters(item, selectedReportSuggestions);

      const matchesSearch = includesSearchText(
        [
          item.resume?.name,
          item.jd?.title,
          report.overall_grade,
          `${report.overall_grade} 등급`,
          report.status,
          REPORT_STATUS_LABEL[report.status],
          report.overall_summary,
          report.candidate_summary,
          report.fit_analysis,
          report.motive,
          report.collaboration,
          report.final_comment,
          toList(report.check_point).join(' '),
          toList(report.concern).join(' '),
          questionText,
        ],
        reportTextSearch,
      );

      return matchesSuggestions && matchesSearch;
    });

    return [...filtered].sort((left, right) => gradeScore(right.report.overall_grade) - gradeScore(left.report.overall_grade));
  }, [reportItems, reportTextSearch, selectedReportSuggestions]);
  const filteredReportIds = useMemo(
    () => new Set(filteredReportItems.map((item) => item.report.id)),
    [filteredReportItems],
  );
  const filteredReportTreeItems = useMemo(
    () =>
      reportTreeItems
        .map((group) => ({
          ...group,
          reports: group.reports.filter((item) => filteredReportIds.has(item.report.id)),
        }))
        .filter((group) => group.reports.length > 0),
    [filteredReportIds, reportTreeItems],
  );
  const displaySelectedItem =
    filteredReportItems.find((item) => String(item.report.id) === selectedReportId) ??
    filteredReportItems[0] ??
    null;
  const selectedChecklist = displaySelectedItem ? checklistItems(displaySelectedItem.report) : [];
  const motiveItems = displaySelectedItem ? toList(displaySelectedItem.report.motive) : [];
  const collaborationItems = displaySelectedItem ? toList(displaySelectedItem.report.collaboration) : [];
  const isEditingReport = Boolean(displaySelectedItem && editingReportId === displaySelectedItem.report.id);

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

  const toggleReportSuggestion = (suggestion: string) => {
    setReportSearchText((current) => toggleSuggestionInSearchText(current, REPORT_SEARCH_SUGGESTIONS, suggestion));
  };

  const startReportEdit = () => {
    if (!displaySelectedItem || isReportPending(displaySelectedItem.report)) {
      return;
    }

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
    if (!displaySelectedItem || isReportPending(displaySelectedItem.report)) {
      return;
    }

    setIsSavingReport(true);

    try {
      await apiClient.saveReport(reportEditPayload(displaySelectedItem.report.id, values));
      await reloadData();
      setEditingReportId(null);
    } finally {
      setIsSavingReport(false);
    }
  };

  return (
    <div className="analysis-report-page viewport-page">
      <PageTitle
        eyebrow="Analysis Report"
        title="분석 리포트 / 질문 추천"
        description="지원자별 분석 리포트와 추천 면접 질문을 분리해서 확인합니다."
        actions={
          <Button icon={<MessageOutlined />} disabled={!displaySelectedItem} onClick={() => navigate('/chat')}>
            채팅으로 질문하기
          </Button>
        }
      />
      <Row className="section-row split-editor-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={8}>
          <SectionCard className="scroll-card-body" title="리포트 목록">
            <p className="list-panel-hint">
              리포트를 선택하면 오른쪽에서 분석 결과와 추천 질문을 확인할 수 있습니다.
            </p>
            {reportItems.length ? (
              <>
                <div className="list-query-controls">
                  <Input
                    allowClear
                    className="list-query-input"
                    placeholder="지원자, JD, 질문 검색"
                    value={reportSearchText}
                    onChange={(event) => setReportSearchText(event.target.value)}
                  />
                  <span className="list-query-count">
                    {filteredReportItems.length} / {reportItems.length}건
                  </span>
                  <SearchSuggestions
                    ariaLabel="리포트 추천검색어"
                    query={reportSuggestionQuery}
                    selectedValues={selectedReportSuggestions}
                    suggestions={REPORT_SEARCH_SUGGESTIONS}
                    onToggle={toggleReportSuggestion}
                  />
                </div>
                {filteredReportItems.length ? (
                  <div className="analysis-report-tree" role="tree" aria-label="리포트 트리">
                    {filteredReportTreeItems.map((group) => {
                      const resumeName = group.resume?.name || '지원자 정보 없음';
                      const jdTitle = group.jd?.title || '연결 JD 없음';

                      return (
                        <div className="analysis-report-tree-group" key={group.resume?.id ?? resumeName}>
                          <div className="analysis-report-tree-resume" role="treeitem" aria-expanded="true">
                            <strong>{resumeName}</strong>
                            <span>{jdTitle}</span>
                            <Tag>{group.reports.length}개 리포트</Tag>
                          </div>
                          <div className="analysis-report-tree-children" role="group" aria-label={`${resumeName} 리포트`}>
                            {group.reports.map((item, index) => {
                              const active = displaySelectedItem?.report.id === item.report.id;

                              return (
                                <button
                                  className={`analysis-report-tree-report ${active ? 'active' : ''}`}
                                  key={item.report.id}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => setSelectedReportId(String(item.report.id))}
                                >
                                  <span className="analysis-report-tree-report-main">리포트 {index + 1}</span>
                                  <span className="analysis-report-tree-report-meta">
                                    {formatReportTimestamp(item.report.created_at)}
                                  </span>
                                  {reportListTag(item.report)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState description="조건에 맞는 리포트가 없습니다." />
                )}
              </>
            ) : (
              <EmptyState description="아직 생성된 분석 리포트가 없습니다." />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard className="scroll-card-body" title="리포트 / 질문 상세">
            {displaySelectedItem ? (
              <div className="analysis-report-detail">
                <div className="analysis-report-selected-summary">
                  <strong>{displaySelectedItem.resume?.name || '지원자 정보 없음'}</strong>
                  <span>{displaySelectedItem.jd?.title || '연결 JD 없음'}</span>
                </div>
                <div className="analysis-report-detail-toolbar">
                  {isEditingReport ? (
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={isSavingReport}
                        onClick={() => reportForm.submit()}
                      >
                        리포트 저장
                      </Button>
                      <Button disabled={isSavingReport} onClick={cancelReportEdit}>
                        취소
                      </Button>
                    </Space>
                  ) : (
                    <Space wrap>
                      <Button
                        icon={<EditOutlined />}
                        disabled={isReportPending(displaySelectedItem.report)}
                        title={
                          isReportPending(displaySelectedItem.report)
                            ? '분석이 완료된 리포트만 수정할 수 있습니다.'
                            : undefined
                        }
                        onClick={startReportEdit}
                      >
                        리포트 수정
                      </Button>
                      <Button
                        danger
                        disabled
                        icon={<DeleteOutlined />}
                        title="현재 백엔드에서 리포트 삭제를 지원하지 않습니다."
                      >
                        삭제 불가
                      </Button>
                    </Space>
                  )}
                </div>
                <Tabs
                  defaultActiveKey="report"
                  items={[
                    {
                      key: 'report',
                      label: '분석 리포트',
                      children: (
                        <div className="analysis-report-tab-panel">
                          {isReportPending(displaySelectedItem.report) ? (
                            <div className="analysis-report-pending-panel">
                              <Tag color={displaySelectedItem.report.status === 'processing' ? 'processing' : 'warning'}>
                                {REPORT_STATUS_LABEL[displaySelectedItem.report.status]}
                              </Tag>
                              <h3>
                                {displaySelectedItem.report.status === 'processing'
                                  ? '분석 중입니다.'
                                  : '분석 대기 중입니다.'}
                              </h3>
                              <p>분석이 완료되면 등급, 요약, 체크리스트와 추천 질문이 이 화면에 표시됩니다.</p>
                              <Button disabled={refreshing} onClick={() => void reloadData()}>
                                {refreshing ? '불러오는 중' : '다시 불러오기'}
                              </Button>
                            </div>
                          ) : isEditingReport ? (
                            <Form
                              className="analysis-report-edit-form"
                              form={reportForm}
                              layout="vertical"
                              onFinish={(values) => void saveReportEdit(values)}
                            >
                              <div className="analysis-report-edit-grid">
                                <Form.Item label="종합 등급" name="overall_grade">
                                  <Input aria-label="종합 등급 수정" placeholder="예: A" />
                                </Form.Item>
                                <Form.Item label="전체 평가 요약" name="overall_summary">
                                  <Input.TextArea
                                    aria-label="전체 평가 요약 수정"
                                    autoSize={{ minRows: 3, maxRows: 7 }}
                                    placeholder="전체 평가 요약을 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="지원자 요약" name="candidate_summary">
                                  <Input.TextArea
                                    aria-label="지원자 요약 수정"
                                    autoSize={{ minRows: 3, maxRows: 7 }}
                                    placeholder="지원자 요약을 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="역량 분석" name="competency_analysis">
                                  <Input.TextArea
                                    aria-label="역량 분석 수정"
                                    autoSize={{ minRows: 4, maxRows: 10 }}
                                    placeholder="항목별로 줄을 나누어 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="적합도 분석" name="fit_analysis">
                                  <Input.TextArea
                                    aria-label="적합도 분석 수정"
                                    autoSize={{ minRows: 4, maxRows: 10 }}
                                    placeholder="적합도 분석을 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="지원 동기" name="motive">
                                  <Input.TextArea
                                    aria-label="지원 동기 수정"
                                    autoSize={{ minRows: 3, maxRows: 7 }}
                                    placeholder="지원 동기 분석을 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="협업 역량" name="collaboration">
                                  <Input.TextArea
                                    aria-label="협업 역량 수정"
                                    autoSize={{ minRows: 3, maxRows: 7 }}
                                    placeholder="협업 역량 분석을 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="강점" name="strength">
                                  <Input.TextArea
                                    aria-label="강점 수정"
                                    autoSize={{ minRows: 4, maxRows: 10 }}
                                    placeholder="항목별로 줄을 나누어 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="우려 / 검증 필요" name="concern">
                                  <Input.TextArea
                                    aria-label="우려 / 검증 필요 수정"
                                    autoSize={{ minRows: 4, maxRows: 10 }}
                                    placeholder="항목별로 줄을 나누어 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="확인 포인트" name="check_point">
                                  <Input.TextArea
                                    aria-label="확인 포인트 수정"
                                    autoSize={{ minRows: 4, maxRows: 10 }}
                                    placeholder="항목별로 줄을 나누어 입력하세요"
                                  />
                                </Form.Item>
                                <Form.Item label="최종 코멘트" name="final_comment">
                                  <Input.TextArea
                                    aria-label="최종 코멘트 수정"
                                    autoSize={{ minRows: 3, maxRows: 7 }}
                                    placeholder="최종 코멘트를 입력하세요"
                                  />
                                </Form.Item>
                              </div>
                            </Form>
                          ) : (
                            <>
                              <div className="analysis-report-hero">
                                <div>
                                  <span className="eyebrow">Overall Grade</span>
                                  <h2>{displaySelectedItem.report.overall_grade || 'N/A'}</h2>
                                </div>
                              </div>
                              <section className="analysis-report-section">
                                <h3>전체 평가 요약</h3>
                                <p>{displaySelectedItem.report.overall_summary || '요약이 없습니다.'}</p>
                              </section>
                              <section className="analysis-report-section">
                                <h3>지원자 요약</h3>
                                <p>{displaySelectedItem.report.candidate_summary || '지원자 요약이 없습니다.'}</p>
                              </section>
                              <section className="analysis-report-section">
                                <h3>체크리스트</h3>
                                <div className="analysis-report-checklist">
                                  {selectedChecklist.length ? (
                                    selectedChecklist.map((item) => (
                                      <div className="analysis-report-check-row" key={item.content}>
                                        <Tag color={item.result ? 'success' : 'warning'}>
                                          {item.result ? '충족' : '미충족'}
                                        </Tag>
                                        <span>{item.content}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="muted">체크리스트가 없습니다.</p>
                                  )}
                                </div>
                              </section>
                              <section className="analysis-report-section">
                                <h3>역량 분석</h3>
                                <CompactTextList
                                  items={toList(displaySelectedItem.report.competency_analysis)}
                                  emptyText="역량 분석이 없습니다."
                                />
                              </section>
                              <section className="analysis-report-section">
                                <h3>적합도 분석</h3>
                                <CompactTextList
                                  items={toList(displaySelectedItem.report.fit_analysis)}
                                  emptyText="적합도 분석이 없습니다."
                                />
                              </section>
                              {motiveItems.length ? (
                                <section className="analysis-report-section">
                                  <h3>지원 동기</h3>
                                  <CompactTextList items={motiveItems} emptyText="지원 동기 분석이 없습니다." />
                                </section>
                              ) : null}
                              {collaborationItems.length ? (
                                <section className="analysis-report-section">
                                  <h3>협업 역량</h3>
                                  <CompactTextList items={collaborationItems} emptyText="협업 분석이 없습니다." />
                                </section>
                              ) : null}
                              <section className="analysis-report-section">
                                <h3>강점</h3>
                                <CompactTextList
                                  items={toList(displaySelectedItem.report.strength)}
                                  emptyText="강점 정보가 없습니다."
                                />
                              </section>
                              <section className="analysis-report-section">
                                <h3>우려 / 검증 필요</h3>
                                <CompactTextList
                                  items={toList(displaySelectedItem.report.concern)}
                                  emptyText="우려 사항이 없습니다."
                                />
                              </section>
                              <section className="analysis-report-section">
                                <h3>확인 포인트</h3>
                                <CompactTextList
                                  items={toList(displaySelectedItem.report.check_point)}
                                  emptyText="확인 포인트가 없습니다."
                                />
                              </section>
                              <section className="analysis-report-section">
                                <h3>최종 코멘트</h3>
                                <p>{displaySelectedItem.report.final_comment || '최종 코멘트가 없습니다.'}</p>
                              </section>
                            </>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'questions',
                      label: '질문 추천',
                      children: (
                        <CompactQuestionList
                          key={displaySelectedItem.report.id}
                          questions={displaySelectedItem.questions}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            ) : (
              <EmptyState description="분석 요청을 완료하면 리포트와 질문 추천이 표시됩니다." />
            )}
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
