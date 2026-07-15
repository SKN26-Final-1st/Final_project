import { Button, Col, Form, Input, InputNumber, Row, type FormInstance } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export type AuthKeyCreateFormValues = {
  name: string;
  description?: string;
  credit_limit?: number;
};

type AuthKeyCreateFormProps = {
  form: FormInstance<AuthKeyCreateFormValues>;
  loading: boolean;
  maxCredit: number;
  onFinish: (values: AuthKeyCreateFormValues) => void;
};

export function AuthKeyCreateForm({ form, loading, maxCredit, onFinish }: AuthKeyCreateFormProps) {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Row gutter={[12, 0]}>
        <Col xs={24} md={8}>
          <Form.Item label="키 이름" name="name" rules={[{ required: true, message: '키 이름을 입력해주세요.' }]}>
            <Input placeholder="예: 외부 면접관 공유" />
          </Form.Item>
        </Col>
        <Col xs={24} md={10}>
          <Form.Item label="설명" name="description">
            <Input placeholder="사용 목적" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item
            label="제공 Credit"
            name="credit_limit"
            rules={[
              { type: 'number', min: 0, message: '0 이상의 정수만 입력할 수 있습니다.' },
              {
                validator: (_, value?: number) => {
                  if (!value || value <= maxCredit) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('보유 Credit을 초과할 수 없습니다.'));
                },
              },
            ]}
          >
            <InputNumber min={0} precision={0} className="full-width-control" placeholder="0" />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading}>
        API key 발급
      </Button>
    </Form>
  );
}
