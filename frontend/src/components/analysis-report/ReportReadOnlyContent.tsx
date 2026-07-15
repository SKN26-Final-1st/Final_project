import { Tag, Typography } from 'antd';
import { CompactTextList } from '../common/CompactTextList';
import type { AnalysisReport } from '../../data/backendTypes';
import { checklistItems, toDisplayList } from './reportPresentation';

type ReportReadOnlyContentProps = {
  report: AnalysisReport;
  variant?: 'internal' | 'shared';
};

type TextListProps = {
  items: string[];
  emptyText: string;
  shared: boolean;
};

function ReportTextList({ items, emptyText, shared }: TextListProps) {
  if (!shared) {
    return <CompactTextList items={items} emptyText={emptyText} />;
  }

  if (!items.length) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ul className="shared-report-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ReportReadOnlyContent({ report, variant = 'internal' }: ReportReadOnlyContentProps) {
  const shared = variant === 'shared';
  const checklist = checklistItems(report);
  const motiveItems = toDisplayList(report.motive);
  const collaborationItems = toDisplayList(report.collaboration);

  const section = (title: string, content: React.ReactNode) =>
    shared ? (
      <section key={title}>
        <Typography.Title level={5}>{title}</Typography.Title>
        {content}
      </section>
    ) : (
      <section className="analysis-report-section" key={title}>
        <h3>{title}</h3>
        {content}
      </section>
    );

  return (
    <div className={shared ? 'shared-report-copy' : 'analysis-report-readonly-content'}>
      {shared ? (
        <>
          <Typography.Title level={4}>{report.overall_grade} 등급</Typography.Title>
          <p>{report.overall_summary}</p>
          <p>{report.candidate_summary}</p>
        </>
      ) : (
        <>
          <div className="analysis-report-hero">
            <div>
              <span className="eyebrow">Overall Grade</span>
              <h2>{report.overall_grade || 'N/A'}</h2>
            </div>
          </div>
          {section('전체 평가 요약', <p>{report.overall_summary || '요약이 없습니다.'}</p>)}
          {section('지원자 요약', <p>{report.candidate_summary || '지원자 요약이 없습니다.'}</p>)}
        </>
      )}
      {section(
        '체크리스트',
        <div className={shared ? 'shared-report-checklist' : 'analysis-report-checklist'}>
          {checklist.length ? (
            checklist.map((item) => (
              <div className={shared ? 'shared-report-check-row' : 'analysis-report-check-row'} key={item.content}>
                <Tag color={item.result ? 'success' : 'warning'}>{item.result ? '충족' : '미충족'}</Tag>
                <span>{item.content}</span>
              </div>
            ))
          ) : (
            <p className="muted">체크리스트가 없습니다.</p>
          )}
        </div>,
      )}
      {section(
        '역량 분석',
        <ReportTextList items={toDisplayList(report.competency_analysis)} emptyText="역량 분석이 없습니다." shared={shared} />,
      )}
      {section(
        '적합도 분석',
        <ReportTextList items={toDisplayList(report.fit_analysis)} emptyText="적합도 분석이 없습니다." shared={shared} />,
      )}
      {motiveItems.length
        ? section('지원 동기', <ReportTextList items={motiveItems} emptyText="지원 동기 분석이 없습니다." shared={shared} />)
        : null}
      {collaborationItems.length
        ? section('협업 역량', <ReportTextList items={collaborationItems} emptyText="협업 분석이 없습니다." shared={shared} />)
        : null}
      {section(
        '강점',
        <ReportTextList items={toDisplayList(report.strength)} emptyText="강점 정보가 없습니다." shared={shared} />,
      )}
      {section(
        shared ? '우려/검증 필요' : '우려 / 검증 필요',
        <ReportTextList items={toDisplayList(report.concern)} emptyText="우려 사항이 없습니다." shared={shared} />,
      )}
      {section(
        '확인 포인트',
        shared ? (
          <ul>
            {toDisplayList(report.check_point).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <ReportTextList items={toDisplayList(report.check_point)} emptyText="확인 포인트가 없습니다." shared={false} />
        ),
      )}
      {section('최종 코멘트', <p>{report.final_comment || '최종 코멘트가 없습니다.'}</p>)}
    </div>
  );
}
