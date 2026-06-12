import { Button, Col, Form, Input, Progress, Row, Select, type FormInstance } from 'antd';
import type { JdItem } from '../../api/adapters';
import type { Navigate } from '../../types/app';

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
  selectedJd: JdItem;
  initialValues: JdEditorFormValues;
  navigate: Navigate;
};

export function JdEditorPanel({ form, selectedJd, initialValues, navigate }: JdEditorPanelProps) {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
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
        <Select mode="tags" tokenSeparators={[',']} placeholder="필수 기술을 입력하세요" />
      </Form.Item>
      <Form.Item label="우대 기술" name="preferred_skill">
        <Select mode="tags" tokenSeparators={[',']} placeholder="우대 기술을 입력하세요" />
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
            <span className="form-stat-label">평균 등급 점수</span>
            <Progress percent={selectedJd.fit} />
          </div>
        </Col>
        <Col span={24}>
          <div className="inline-action-box">
            <span>모집 공고 작성 화면으로 연결</span>
            <Button onClick={() => navigate('/recruitment-post')} type="primary" ghost>
              공고 작성
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
}
