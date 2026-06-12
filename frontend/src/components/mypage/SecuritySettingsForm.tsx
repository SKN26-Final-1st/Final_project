import { Form, Input } from 'antd';

export function SecuritySettingsForm() {
  return (
    <Form layout="vertical">
      <Form.Item label="현재 비밀번호">
        <Input.Password />
      </Form.Item>
      <Form.Item label="새 비밀번호">
        <Input.Password />
      </Form.Item>
    </Form>
  );
}
