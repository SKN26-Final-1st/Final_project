import { Col, Form, Input, Progress, Row, Select, Tag, type FormInstance } from 'antd';
import type { JdItem } from '../../api/adapters';

const { TextArea } = Input;

export type JdEditorFormValues = {
  job_name: string;
  education_level: string;
  major: string;
  career_level: string;
  required_skill: string[];
  preferred_skill: string[];
  main_task: string;
  hiring_reason: string;
  work_type: string;
  status: 'prepare' | 'on_going' | 'closed';
};

type JdEditorPanelProps = {
  form: FormInstance<JdEditorFormValues>;
  selectedJd: JdItem | null;
  initialValues: JdEditorFormValues;
  mode?: 'create' | 'edit';
};

export function JdEditorPanel({ form, selectedJd, initialValues, mode = 'edit' }: JdEditorPanelProps) {
  const isCreateMode = mode === 'create';

  return (
    <Form className="jd-editor-form" form={form} layout="vertical" initialValues={initialValues}>
      <div className="jd-editor-mode-row">
        <Tag color={isCreateMode ? 'processing' : 'blue'}>{isCreateMode ? '신규 작성' : '수정 모드'}</Tag>
        <span>
          {isCreateMode ? '필수 항목을 입력해 JD를 등록합니다.' : '선택한 JD 정보를 수정합니다.'}
        </span>
      </div>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="JD명" name="job_name" rules={[{ required: true, message: 'JD명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="전공 요건" name="major">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="학력" name="education_level">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="경력" name="career_level" rules={[{ required: true, message: '경력 요건을 입력하세요.' }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="주요 업무" name="main_task">
        <TextArea rows={4} />
      </Form.Item>
      <Form.Item label="필수 기술" name="required_skill" rules={[{ required: true, message: '필수 기술을 입력하세요.' }]}>
        <Select mode="tags" tokenSeparators={[',']} placeholder="필수 기술을 입력하세요." />
      </Form.Item>
      <Form.Item label="우대 기술" name="preferred_skill">
        <Select mode="tags" tokenSeparators={[',']} placeholder="우대 기술을 입력하세요." />
      </Form.Item>
      <Form.Item label="채용 배경" name="hiring_reason">
        <TextArea rows={3} />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="고용 형태" name="work_type">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="상태" name="status">
            <Select
              options={[
                { value: 'prepare', label: '준비 중' },
                { value: 'on_going', label: '진행 중' },
                { value: 'closed', label: '마감' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <div className="mini-panel">
            {isCreateMode ? (
              <>
                <span className="form-stat-label">작성 상태</span>
                <strong>신규 JD</strong>
                <p className="muted">필수값을 입력한 뒤 JD 등록을 눌러 저장하세요.</p>
              </>
            ) : (
              <>
                <span className="form-stat-label">평균 등급 점수</span>
                <Progress percent={selectedJd?.fit ?? 0} />
              </>
            )}
          </div>
        </Col>
      </Row>
    </Form>
  );
}
