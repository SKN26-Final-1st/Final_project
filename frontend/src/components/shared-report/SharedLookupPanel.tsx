import { KeyOutlined, SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Space } from 'antd';
import type { FormInstance } from 'antd';
import type { SharedLookupValues } from './sharedReportTypes';

type SharedLookupPanelProps = {
  form: FormInstance<SharedLookupValues>;
  initialResumeId?: number;
  loading: boolean;
  onSubmit: (values: SharedLookupValues) => void;
};

export function SharedLookupPanel({ form, initialResumeId, loading, onSubmit }: SharedLookupPanelProps) {
  return (
    <Card className="shared-report-lookup">
      <Form form={form} layout="vertical" initialValues={{ resumeId: initialResumeId }} onFinish={onSubmit}>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={8}>
            <Form.Item label="Resume ID" name="resumeId" rules={[{ required: true, message: 'resume id를 입력하세요.' }]}>
              <InputNumber min={1} precision={0} className="full-width-control" placeholder="예: 12" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: 'API key를 입력하세요.' }]}>
              <Input.Password prefix={<KeyOutlined />} placeholder="발급받은 key를 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Space wrap>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
            결과 조회
          </Button>
          <Alert
            showIcon
            type="info"
            title="API key는 URL에 저장하지 않고 요청 헤더로만 전송됩니다."
            className="shared-inline-alert"
          />
        </Space>
      </Form>
    </Card>
  );
}
