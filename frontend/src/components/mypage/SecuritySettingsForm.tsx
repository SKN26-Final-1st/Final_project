import { Form, Input, type FormInstance } from 'antd';

export type SecuritySettingsFormValues = {
  formal_password?: string;
  password?: string;
  password_confirm?: string;
};

type SecuritySettingsFormProps = {
  form: FormInstance<SecuritySettingsFormValues>;
};

export function SecuritySettingsForm({ form }: SecuritySettingsFormProps) {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        label="현재 비밀번호"
        name="formal_password"
        dependencies={['password']}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('password') && !value) {
                return Promise.reject(new Error('새 비밀번호를 저장하려면 현재 비밀번호가 필요합니다.'));
              }

              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item
        label="새 비밀번호"
        name="password"
        dependencies={['formal_password']}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('formal_password') && !value) {
                return Promise.reject(new Error('새 비밀번호를 입력하세요.'));
              }

              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item
        label="새 비밀번호 확인"
        name="password_confirm"
        dependencies={['password']}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              const password = getFieldValue('password');

              if (!password && !value) {
                return Promise.resolve();
              }

              if (password !== value) {
                return Promise.reject(new Error('새 비밀번호가 일치하지 않습니다.'));
              }

              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>
    </Form>
  );
}
