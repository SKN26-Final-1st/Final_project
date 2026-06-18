import { useEffect } from 'react';
import { Button, Col, Row, Tabs, Tag } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { AnalysisReport } from '../data/backendTypes';
import { useAnalysisReportPageData } from '../hooks/useAnalysisReportPageData';
import type { Navigate } from '../types/app';
import { pageSectionGutter } from '../utils/layout';

type AnalysisReportPageProps = {
  navigate: Navigate;
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
  return Array.isArray(value) ? value.map(toDisplayText).filter(Boolean) : [];
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

function ReportTextList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ul className="analysis-report-text-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function AnalysisReportPage({ navigate }: AnalysisReportPageProps) {
  const { reportItems, selectedItem, selectedReportResumeId, setSelectedReportResumeId } = useAnalysisReportPageData();
  const selectedChecklist = selectedItem ? checklistItems(selectedItem.report) : [];

  useEffect(() => {
    if (!selectedReportResumeId && selectedItem) {
      setSelectedReportResumeId(String(selectedItem.report.resume_id));
    }
  }, [selectedItem, selectedReportResumeId, setSelectedReportResumeId]);

  return (
    <div className="analysis-report-page viewport-page">
      <PageTitle
        eyebrow="Analysis Report"
        title="분석 리포트 / 질문 추천"
        description="지원자별 분석 리포트와 추천 면접 질문을 분리해서 확인합니다."
        actions={
          <Button icon={<MessageOutlined />} disabled={!selectedItem} onClick={() => navigate('/chat')}>
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
              <div className="analysis-report-list" aria-label="Analysis report list">
                {reportItems.map((item) => {
                  const active = selectedItem?.report.id === item.report.id;

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
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState description="아직 생성된 분석 리포트가 없습니다." />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard className="scroll-card-body" title="리포트 / 질문 상세">
            {selectedItem ? (
              <div className="analysis-report-detail">
                <div className="analysis-report-selected-summary">
                  <strong>{selectedItem.resume?.name || '지원자 정보 없음'}</strong>
                  <span>{selectedItem.jd?.title || '연결 JD 없음'}</span>
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
                              <h2>{selectedItem.report.overall_grade || 'N/A'}</h2>
                            </div>
                          </div>
                          <section className="analysis-report-section">
                            <h3>전체 평가 요약</h3>
                            <p>{selectedItem.report.overall_summary || '요약이 없습니다.'}</p>
                          </section>
                          <section className="analysis-report-section">
                            <h3>지원자 요약</h3>
                            <p>{selectedItem.report.candidate_summary || '지원자 요약이 없습니다.'}</p>
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
                            <ReportTextList
                              items={toList(selectedItem.report.competency_analysis)}
                              emptyText="역량 분석이 없습니다."
                            />
                          </section>
                          <section className="analysis-report-section">
                            <h3>적합도 분석</h3>
                            <ReportTextList
                              items={toList(selectedItem.report.fit_analysis)}
                              emptyText="적합도 분석이 없습니다."
                            />
                          </section>
                          <section className="analysis-report-section">
                            <h3>강점</h3>
                            <ReportTextList items={toList(selectedItem.report.strength)} emptyText="강점 정보가 없습니다." />
                          </section>
                          <section className="analysis-report-section">
                            <h3>우려 / 검증 필요</h3>
                            <ReportTextList items={toList(selectedItem.report.concern)} emptyText="우려 사항이 없습니다." />
                          </section>
                          <section className="analysis-report-section">
                            <h3>확인 포인트</h3>
                            <ReportTextList
                              items={toList(selectedItem.report.check_point)}
                              emptyText="확인 포인트가 없습니다."
                            />
                          </section>
                          <section className="analysis-report-section">
                            <h3>최종 코멘트</h3>
                            <p>{selectedItem.report.final_comment || '최종 코멘트가 없습니다.'}</p>
                          </section>
                        </div>
                      ),
                    },
                    {
                      key: 'questions',
                      label: '질문 추천',
                      children: selectedItem.questions.length ? (
                        <div className="analysis-report-question-list">
                          {selectedItem.questions.map((item, index) => (
                            <article className="analysis-report-question" key={item.id ?? `${item.question}-${index}`}>
                              <span>질문</span>
                              <strong>{item.question}</strong>
                              <span>예상 / 모범 답변</span>
                              <p>{item.answer}</p>
                              <span>질문 의도</span>
                              <p>{item.purpose}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">추천 면접 질문이 없습니다.</p>
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
