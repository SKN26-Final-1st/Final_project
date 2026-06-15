import { Button, Flex, Form, Input } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, LoginOutlined } from '@ant-design/icons';
import { InlineLoading } from '../../components/common/InlineLoading';
import { AuthScreen } from '../../components/layout/AuthScreen';
import { apiClient } from '../../api/backendClient';
import type { AuthPageBaseProps } from './types';

type LoginValues = {
  username: string;
  password: string;
};

type LoginPageProps = AuthPageBaseProps & {
  onLoginSuccess?: () => void;
};

export function LoginPage({ mode, navigate, themeSwitch, loadingKey, runApiAction, onLoginSuccess }: LoginPageProps) {
  return (
    <AuthScreen
      mode={mode}
      nav={navigate}
      themeSwitch={themeSwitch}
      title="채용 데이터 입력부터 분석 리포트와 질의응답까지"
      cardTitle="로그인"
      card={
        <Form<LoginValues>
          layout="vertical"
          onFinish={(values) =>
            void runApiAction('login', () => apiClient.login(values.username, values.password), () => onLoginSuccess?.())
          }
        >
          <Form.Item label="아이디" name="username" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="비밀번호" name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
            <Input.Password iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
          </Form.Item>
          <Button
            type="primary"
            block
            htmlType="submit"
            icon={loadingKey === 'login' ? undefined : <LoginOutlined />}
            disabled={loadingKey === 'login'}
          >
            {loadingKey === 'login' ? <InlineLoading label="로그인 중" /> : '로그인'}
          </Button>
          <Flex justify="space-between" className="auth-links">
            <button type="button" className="auth-text-link" onClick={() => navigate('/signup')}>
              회원가입
            </button>
            <button type="button" className="auth-text-link" onClick={() => navigate('/password-reset')}>
              비밀번호 찾기
            </button>
          </Flex>
        </Form>
      }
    />
  );
}
