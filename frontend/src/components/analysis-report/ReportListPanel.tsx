import { Input, Tag } from 'antd';
import { EmptyState } from '../common/PageState';
import { SearchSuggestions } from '../common/SearchSuggestions';
import type { AnalysisReportItem, AnalysisReportTreeItem } from '../../hooks/useAnalysisReportPageData';
import { REPORT_SEARCH_SUGGESTIONS } from './reportFilterConfig';
import { formatReportTimestamp, getReportStatusLabel, isReportPending } from './reportPresentation';

type ReportListPanelProps = {
  allItems: AnalysisReportItem[];
  filteredItems: AnalysisReportItem[];
  treeItems: AnalysisReportTreeItem[];
  selectedReportId: number | null;
  searchText: string;
  suggestionQuery: string;
  selectedSuggestions: string[];
  onSearchTextChange: (value: string) => void;
  onToggleSuggestion: (value: string) => void;
  onSelectReport: (reportId: string) => void;
};

function ReportStatusTag({ item }: { item: AnalysisReportItem }) {
  const report = item.report;

  if (isReportPending(report)) {
    return <Tag color={report.status === 'processing' ? 'processing' : 'warning'}>{getReportStatusLabel(report.status)}</Tag>;
  }

  if (report.status === 'fail') {
    return <Tag color="error">{getReportStatusLabel(report.status)}</Tag>;
  }

  return <Tag color="success">{getReportStatusLabel(report.status)}</Tag>;
}

export function ReportListPanel({
  allItems,
  filteredItems,
  treeItems,
  selectedReportId,
  searchText,
  suggestionQuery,
  selectedSuggestions,
  onSearchTextChange,
  onToggleSuggestion,
  onSelectReport,
}: ReportListPanelProps) {
  return (
    <>
      <p className="list-panel-hint">리포트를 선택하면 오른쪽에서 분석 결과와 추천 질문을 확인할 수 있습니다.</p>
      {allItems.length ? (
        <>
          <div className="list-query-controls">
            <Input
              allowClear
              className="list-query-input"
              placeholder="지원자, JD, 질문 검색"
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
            />
            <span className="list-query-count">{filteredItems.length} / {allItems.length}건</span>
            <SearchSuggestions
              ariaLabel="리포트 추천검색어"
              query={suggestionQuery}
              selectedValues={selectedSuggestions}
              suggestions={REPORT_SEARCH_SUGGESTIONS}
              onToggle={onToggleSuggestion}
            />
          </div>
          {filteredItems.length ? (
            <div className="analysis-report-tree" role="tree" aria-label="리포트 트리">
              {treeItems.map((group) => {
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
                        const active = selectedReportId === item.report.id;

                        return (
                          <button
                            className={`analysis-report-tree-report ${active ? 'active' : ''}`}
                            key={item.report.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onSelectReport(String(item.report.id))}
                          >
                            <span className="analysis-report-tree-report-main">리포트 {index + 1}</span>
                            <span className="analysis-report-tree-report-meta">{formatReportTimestamp(item.report.created_at)}</span>
                            {item.report.version !== undefined && item.report.version !== null ? (
                              <Tag color="blue">v{item.report.version}</Tag>
                            ) : null}
                            <ReportStatusTag item={item} />
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
    </>
  );
}
