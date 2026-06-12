import { Form, Input, InputNumber, Switch } from 'antd';
import type { UserProfile } from '../../api/adapters';

type AccountSettingsFormProps = {
  profile: UserProfile;
};

export function AccountSettingsForm({ profile }: AccountSettingsFormProps) {
  return (
    <Form layout="vertical" initialValues={profile}>
      <Form.Item label="계정 ID" name="username">
        <Input readOnly />
      </Form.Item>
      <Form.Item label="담당자명" name="displayName">
        <Input />
      </Form.Item>
      <Form.Item label="분석 크레딧" name="credit">
        <InputNumber min={0} className="full-width-control" />
      </Form.Item>
      <Form.Item label="구독 여부" name="subscribe" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item label="본인 확인 질문" name="verificationQuestion">
        <Input />
      </Form.Item>
    </Form>
  );
}
