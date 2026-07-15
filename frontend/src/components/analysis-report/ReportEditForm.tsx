import { Form, Input, type FormInstance } from 'antd';
import type { ReportEditFormValues } from './reportPresentation';

type ReportEditFormProps = {
  form: FormInstance<ReportEditFormValues>;
  initialValues: ReportEditFormValues;
  onFinish: (values: ReportEditFormValues) => void;
};

export function ReportEditForm({ form, initialValues, onFinish }: ReportEditFormProps) {
  return (
    <Form
      className="analysis-report-edit-form"
      form={form}
      initialValues={initialValues}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="analysis-report-edit-grid">
        <Form.Item label="종합 등급" name="overall_grade">
          <Input aria-label="종합 등급 수정" placeholder="예: A" />
        </Form.Item>
        <Form.Item label="전체 평가 요약" name="overall_summary">
          <Input.TextArea aria-label="전체 평가 요약 수정" autoSize={{ minRows: 3, maxRows: 7 }} placeholder="전체 평가 요약을 입력하세요" />
        </Form.Item>
        <Form.Item label="지원자 요약" name="candidate_summary">
          <Input.TextArea aria-label="지원자 요약 수정" autoSize={{ minRows: 3, maxRows: 7 }} placeholder="지원자 요약을 입력하세요" />
        </Form.Item>
        <Form.Item label="역량 분석" name="competency_analysis">
          <Input.TextArea aria-label="역량 분석 수정" autoSize={{ minRows: 4, maxRows: 10 }} placeholder="항목별로 줄을 나누어 입력하세요" />
        </Form.Item>
        <Form.Item label="적합도 분석" name="fit_analysis">
          <Input.TextArea aria-label="적합도 분석 수정" autoSize={{ minRows: 4, maxRows: 10 }} placeholder="적합도 분석을 입력하세요" />
        </Form.Item>
        <Form.Item label="지원 동기" name="motive">
          <Input.TextArea aria-label="지원 동기 수정" autoSize={{ minRows: 3, maxRows: 7 }} placeholder="지원 동기 분석을 입력하세요" />
        </Form.Item>
        <Form.Item label="협업 역량" name="collaboration">
          <Input.TextArea aria-label="협업 역량 수정" autoSize={{ minRows: 3, maxRows: 7 }} placeholder="협업 역량 분석을 입력하세요" />
        </Form.Item>
        <Form.Item label="강점" name="strength">
          <Input.TextArea aria-label="강점 수정" autoSize={{ minRows: 4, maxRows: 10 }} placeholder="항목별로 줄을 나누어 입력하세요" />
        </Form.Item>
        <Form.Item label="우려 / 검증 필요" name="concern">
          <Input.TextArea aria-label="우려 / 검증 필요 수정" autoSize={{ minRows: 4, maxRows: 10 }} placeholder="항목별로 줄을 나누어 입력하세요" />
        </Form.Item>
        <Form.Item label="확인 포인트" name="check_point">
          <Input.TextArea aria-label="확인 포인트 수정" autoSize={{ minRows: 4, maxRows: 10 }} placeholder="항목별로 줄을 나누어 입력하세요" />
        </Form.Item>
        <Form.Item label="최종 코멘트" name="final_comment">
          <Input.TextArea aria-label="최종 코멘트 수정" autoSize={{ minRows: 3, maxRows: 7 }} placeholder="최종 코멘트를 입력하세요" />
        </Form.Item>
      </div>
    </Form>
  );
}
