import { Button, Space, Tabs, Tag, type FormInstance } from 'antd';
import { DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import type { AnalysisReportItem } from '../../hooks/useAnalysisReportPageData';
import { QuestionList } from './QuestionList';
import { ReportEditForm } from './ReportEditForm';
import { ReportFeedbackPanel } from './ReportFeedbackPanel';
import { ReportReadOnlyContent } from './ReportReadOnlyContent';
import {
  getReportStatusLabel,
  isReportDeleteBlocked,
  isReportPending,
  reportEditInitialValues,
  type ReportEditFormValues,
} from './reportPresentation';

type ReportDetailPanelProps = {
  item: AnalysisReportItem;
  refreshing: boolean;
  editing: boolean;
  savingReport: boolean;
  reportForm: FormInstance<ReportEditFormValues>;
  feedbackRating: number;
  feedbackReviewText: string;
  feedbackEnabled: boolean;
  feedbackSaving: boolean;
  feedbackHasChanges: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (values: ReportEditFormValues) => void;
  onOpenDelete: () => void;
  onReload: () => void;
  onFeedbackRatingChange: (rating: number) => void;
  onFeedbackReviewTextChange: (reviewText: string) => void;
  onSaveFeedback: () => void;
};

export function ReportDetailPanel({
  item,
  refreshing,
  editing,
  savingReport,
  reportForm,
  feedbackRating,
  feedbackReviewText,
  feedbackEnabled,
  feedbackSaving,
  feedbackHasChanges,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onOpenDelete,
  onReload,
  onFeedbackRatingChange,
  onFeedbackReviewTextChange,
  onSaveFeedback,
}: ReportDetailPanelProps) {
  const report = item.report;

  return (
    <div className="analysis-report-detail">
      <div className="analysis-report-selected-summary">
        <strong>{item.resume?.name || '지원자 정보 없음'}</strong>
        <span>{item.jd?.title || '연결 JD 없음'}</span>
        {report.version !== undefined && report.version !== null ? <Tag color="blue">v{report.version}</Tag> : null}
      </div>
      <div className="analysis-report-detail-toolbar">
        {editing ? (
          <Space wrap>
            <Button type="primary" icon={<SaveOutlined />} loading={savingReport} onClick={() => reportForm.submit()}>
              리포트 저장
            </Button>
            <Button disabled={savingReport} onClick={onCancelEdit}>취소</Button>
          </Space>
        ) : (
          <Space wrap>
            <Button
              icon={<EditOutlined />}
              disabled={isReportPending(report)}
              title={isReportPending(report) ? '분석이 완료된 리포트만 수정할 수 있습니다.' : undefined}
              onClick={onStartEdit}
            >
              리포트 수정
            </Button>
            <Button
              danger
              disabled={isReportDeleteBlocked(report)}
              icon={<DeleteOutlined />}
              title={isReportDeleteBlocked(report) ? '분석 중인 리포트는 삭제할 수 없습니다.' : undefined}
              onClick={onOpenDelete}
            >
              리포트 삭제
            </Button>
          </Space>
        )}
      </div>
      <ReportFeedbackPanel
        rating={feedbackRating}
        reviewText={feedbackReviewText}
        enabled={feedbackEnabled}
        saving={feedbackSaving}
        hasChanges={feedbackHasChanges}
        onRatingChange={onFeedbackRatingChange}
        onReviewTextChange={onFeedbackReviewTextChange}
        onSave={onSaveFeedback}
      />
      <Tabs
        defaultActiveKey="report"
        items={[
          {
            key: 'report',
            label: '분석 리포트',
            children: (
              <div className="analysis-report-tab-panel">
                {isReportPending(report) ? (
                  <div className="analysis-report-pending-panel">
                    <Tag color={report.status === 'processing' ? 'processing' : 'warning'}>
                      {getReportStatusLabel(report.status)}
                    </Tag>
                    <h3>{report.status === 'processing' ? '분석 중입니다.' : '분석 대기 중입니다.'}</h3>
                    <p>분석이 완료되면 등급, 요약, 체크리스트와 추천 질문이 이 화면에 표시됩니다.</p>
                    <Button disabled={refreshing} onClick={onReload}>
                      {refreshing ? '불러오는 중' : '다시 불러오기'}
                    </Button>
                  </div>
                ) : editing ? (
                  <ReportEditForm
                    form={reportForm}
                    initialValues={reportEditInitialValues(report)}
                    onFinish={onSubmitEdit}
                  />
                ) : (
                  <ReportReadOnlyContent report={report} />
                )}
              </div>
            ),
          },
          {
            key: 'questions',
            label: '질문 추천',
            children: <QuestionList key={report.id} questions={item.questions} />,
          },
        ]}
      />
    </div>
  );
}
