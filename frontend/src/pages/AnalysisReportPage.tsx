import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Input, Row, Tabs, Tag } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { CompactTextList } from '../components/common/CompactTextList';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SearchSuggestions, type SearchSuggestion } from '../components/common/SearchSuggestions';
import { SectionCard } from '../components/common/SectionCard';
import type { AnalysisReport, InterviewQuestion } from '../data/backendTypes';
import { useAnalysisReportPageData } from '../hooks/useAnalysisReportPageData';
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

const REPORT_SEARCH_SUGGESTIONS = [
  { label: 'A/B 등급', keywords: ['등급', '상위', '우수'] },
  { label: 'C 이하', keywords: ['등급', '낮은 등급', 'c등급', 'd등급', 'f등급'] },
  { label: '질문 있음', keywords: ['면접 질문', 'interview'] },
  { label: '확인 포인트 있음', keywords: ['확인', '체크 포인트', 'check point'] },
  { label: '우려사항 있음', keywords: ['우려', '검증 필요', 'concern'] },
] satisfies SearchSuggestion[];

const REPORT_GRADE_SUGGESTIONS = ['A/B 등급', 'C 이하'];
const REPORT_CONTENT_SUGGESTIONS = ['질문 있음', '확인 포인트 있음', '우려사항 있음'];

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

function hasListContent(value: unknown) {
  return toList(value).length > 0;
}

function matchesReportSuggestion(
  item: ReturnType<typeof useAnalysisReportPageData>['reportItems'][number],
  suggestion: string,
) {
  const grade = item.report.overall_grade.toUpperCase();

  if (suggestion === 'A/B 등급') {
    return grade === 'A' || grade === 'B';
  }

  if (suggestion === 'C 이하') {
    return grade !== 'A' && grade !== 'B';
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
  item: ReturnType<typeof useAnalysisReportPageData>['reportItems'][number],
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
  const { reportItems, selectedReportResumeId, setSelectedReportResumeId } = useAnalysisReportPageData();
  const [reportSearchText, setReportSearchText] = useState('');
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
  const displaySelectedItem =
    filteredReportItems.find((item) => String(item.report.resume_id) === selectedReportResumeId) ??
    filteredReportItems[0] ??
    null;
  const selectedChecklist = displaySelectedItem ? checklistItems(displaySelectedItem.report) : [];
  const motiveItems = displaySelectedItem ? toList(displaySelectedItem.report.motive) : [];
  const collaborationItems = displaySelectedItem ? toList(displaySelectedItem.report.collaboration) : [];

  useEffect(() => {
    if (!selectedReportResumeId && displaySelectedItem) {
      setSelectedReportResumeId(String(displaySelectedItem.report.resume_id));
    }
  }, [displaySelectedItem, selectedReportResumeId, setSelectedReportResumeId]);

  const toggleReportSuggestion = (suggestion: string) => {
    setReportSearchText((current) => toggleSuggestionInSearchText(current, REPORT_SEARCH_SUGGESTIONS, suggestion));
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
                  <div className="analysis-report-list" aria-label="Analysis report list">
                    {filteredReportItems.map((item) => {
                      const active = displaySelectedItem?.report.id === item.report.id;

                      return (
                        <button
                          className={`analysis-report-list-card ${active ? 'active' : ''}`}
                          key={item.report.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedReportResumeId(String(item.report.resume_id))}
                        >
                          <strong>{item.resume?.name || '지원자 정보 없음'}</strong>
                          <span>{item.jd?.title || '연결 JD 없음'}</span>
                          <Tag>{item.report.overall_grade || 'N/A'} 등급</Tag>
                        </button>
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
                <Tabs
                  defaultActiveKey="report"
                  items={[
                    {
                      key: 'report',
                      label: '분석 리포트',
                      children: (
                        <div className="analysis-report-tab-panel">
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
