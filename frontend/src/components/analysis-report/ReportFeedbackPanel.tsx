import { Button, Input, Rate } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

type ReportFeedbackPanelProps = {
  rating: number;
  reviewText: string;
  enabled: boolean;
  saving: boolean;
  hasChanges: boolean;
  onRatingChange: (rating: number) => void;
  onReviewTextChange: (reviewText: string) => void;
  onSave: () => void;
};

export function ReportFeedbackPanel({
  rating,
  reviewText,
  enabled,
  saving,
  hasChanges,
  onRatingChange,
  onReviewTextChange,
  onSave,
}: ReportFeedbackPanelProps) {
  return (
    <section className="analysis-report-feedback" aria-labelledby="analysis-report-feedback-title">
      <div className="analysis-report-feedback-header">
        <div>
          <h3 id="analysis-report-feedback-title">사용자 리뷰</h3>
          <p>분석 결과의 유용성을 별점과 의견으로 남겨주세요.</p>
        </div>
        <span className="analysis-report-feedback-value" aria-live="polite">
          {rating ? `${rating}점 선택됨` : '별점 미선택'}
        </span>
      </div>
      <div className="analysis-report-feedback-rating">
        <span>별점</span>
        <Rate
          allowClear={false}
          aria-label={`사용자 리뷰 별점 ${rating ? `${rating}점` : '선택 안 함'}`}
          aria-disabled={saving || !enabled}
          aria-describedby={!enabled ? 'analysis-report-feedback-disabled-reason' : undefined}
          disabled={saving || !enabled}
          value={rating}
          onChange={onRatingChange}
        />
      </div>
      <label htmlFor="analysis-report-feedback-text">사용자 의견</label>
      <Input.TextArea
        id="analysis-report-feedback-text"
        aria-label="사용자 리뷰 의견"
        aria-describedby={!enabled ? 'analysis-report-feedback-disabled-reason' : undefined}
        autoSize={{ minRows: 3, maxRows: 7 }}
        disabled={saving || !enabled}
        placeholder="분석 결과에서 유용했거나 보완이 필요한 점을 입력하세요."
        value={reviewText}
        onChange={(event) => onReviewTextChange(event.target.value)}
      />
      <div className="analysis-report-feedback-footer">
        <p id={!enabled ? 'analysis-report-feedback-disabled-reason' : undefined} className="analysis-report-feedback-note">
          {enabled
            ? hasChanges
              ? '저장하지 않은 리뷰 변경사항이 있습니다.'
              : '저장된 사용자 리뷰입니다.'
            : '분석이 완료된 리포트만 평가할 수 있습니다.'}
        </p>
        <Button
          aria-label="리뷰 저장"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!enabled || saving || !hasChanges}
          onClick={onSave}
        >
          리뷰 저장
        </Button>
      </div>
    </section>
  );
}
