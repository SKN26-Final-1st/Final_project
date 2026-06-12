import { useState, type ReactNode } from 'react';
import { Button, Col, Flex, Form, Input, Row, Steps } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, LoginOutlined } from '@ant-design/icons';
import { InlineLoading } from '../components/common/InlineLoading';
import { AuthScreen } from '../components/layout/AuthScreen';
import type { AuthDefaults } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction, ShowAlert, ThemeMode } from '../types/app';

type AuthPageBaseProps = {
  mode: ThemeMode;
  navigate: Navigate;
  themeSwitch: ReactNode;
  loadingKey: string | null;
  authDefaults?: AuthDefaults;
  runApiAction: RunApiAction;
};

type LoginPageProps = AuthPageBaseProps;

type LoginValues = {
  username: string;
  password: string;
};

export function LoginPage({
  mode,
  navigate,
  themeSwitch,
  loadingKey,
  authDefaults,
  runApiAction,
  onLoginSuccess,
}: LoginPageProps & { onLoginSuccess?: () => void }) {
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
          initialValues={{
            username: authDefaults?.username ?? '',
            password: authDefaults?.password ?? '',
          }}
          onFinish={(values) =>
            void runApiAction(
              'login',
              () => apiClient.login(values.username, values.password),
              () => onLoginSuccess?.(),
            )
          }
        >
          <Form.Item label="아이디" name="username">
            <Input />
          </Form.Item>
          <Form.Item label="비밀번호" name="password">
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
            <Button type="link" onClick={() => navigate('/signup')}>
              회원가입
            </Button>
            <Button type="link" onClick={() => navigate('/password-reset')}>
              비밀번호 찾기
            </Button>
          </Flex>
        </Form>
      }
    />
  );
}

type SignupPageProps = AuthPageBaseProps & {
  showAlert: ShowAlert;
};

type SignupValues = {
  username: string;
  password: string;
  name: string;
  verification_question: string;
  verification_answer: string;
};

export function SignupPage({
  mode,
  navigate,
  themeSwitch,
  loadingKey,
  authDefaults,
  runApiAction,
}: SignupPageProps) {
  const [signupForm] = Form.useForm<SignupValues>();

  return (
    <AuthScreen
      mode={mode}
      nav={navigate}
      themeSwitch={themeSwitch}
      title="회사와 지원자 데이터를 한곳에서 관리하는 채용 보조 시스템"
      cardTitle="회원가입"
      card={
        <Form<SignupValues>
          form={signupForm}
          layout="vertical"
          initialValues={{
            username: authDefaults?.username ?? '',
            password: authDefaults?.password ?? '',
            name: authDefaults?.name ?? '',
            verification_question: authDefaults?.verification_question ?? '',
            verification_answer: authDefaults?.verification_answer ?? '',
          }}
          onFinish={(values) => void runApiAction('signup-complete', () => apiClient.completeSignup(values))}
        >
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item label="아이디" name="username">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="확인">
                <Button
                  block
                  disabled={loadingKey === 'signup-check'}
                  onClick={() =>
                    void runApiAction('signup-check', () =>
                      apiClient.checkSignupId(signupForm.getFieldValue('username')),
                    )
                  }
                >
                  중복 확인
                </Button>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="담당자명" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="비밀번호" name="password">
            <Input.Password />
          </Form.Item>
          <Form.Item label="본인확인 질문" name="verification_question">
            <Input />
          </Form.Item>
          <Form.Item label="본인확인 답변" name="verification_answer">
            <Input />
          </Form.Item>
          <Button
            type="primary"
            block
            htmlType="submit"
            disabled={loadingKey === 'signup-complete'}
          >
            {loadingKey === 'signup-complete' ? <InlineLoading label="가입 중" /> : '가입 완료'}
          </Button>
        </Form>
      }
    />
  );
}

type PasswordResetPageProps = AuthPageBaseProps & {
  resetStep: number;
  setResetStep: (step: number | ((current: number) => number)) => void;
  showAlert: ShowAlert;
};

export function PasswordResetPage({
  mode,
  navigate,
  themeSwitch,
  loadingKey,
  authDefaults,
  runApiAction,
  resetStep,
  setResetStep,
}: PasswordResetPageProps) {
  const [resetForm] = Form.useForm<{ username: string; verification_answer: string }>();
  const [verificationQuestion, setVerificationQuestion] = useState(authDefaults?.verification_question ?? '');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const stepContents = [
    <Form.Item label="아이디" name="username" key="id">
      <Input />
    </Form.Item>,
    <div key="question">
      <Form.Item label="본인확인 질문">
        <Input value={verificationQuestion || '아이디 확인 후 질문을 불러옵니다.'} readOnly />
      </Form.Item>
      <Form.Item label="본인확인 답변" name="verification_answer">
        <Input />
      </Form.Item>
    </div>,
    <Form.Item label="임시 비밀번호" key="password">
      <Input value={temporaryPassword || '재설정 완료 후 표시됩니다.'} readOnly />
    </Form.Item>,
  ];

  return (
    <AuthScreen
      mode={mode}
      nav={navigate}
      themeSwitch={themeSwitch}
      title="단계형 재설정 플로우로 인증 화면 상태를 확인합니다."
      cardTitle="비밀번호 찾기"
      card={
        <Form
          form={resetForm}
          layout="vertical"
          initialValues={{
            username: authDefaults?.username ?? '',
            verification_answer: authDefaults?.verification_answer ?? '',
          }}
        >
          <Steps size="small" current={resetStep} items={[{ title: 'ID' }, { title: '질문' }, { title: '변경' }]} />
          <div className="step-panel">{stepContents[resetStep]}</div>
          <Button
            type="primary"
            block
            disabled={loadingKey === 'password-question' || loadingKey === 'password-reset'}
            onClick={() => {
              const username = resetForm.getFieldValue('username');

              if (resetStep === 0) {
                void runApiAction('password-question', () => apiClient.getPasswordQuestion(username), (response) => {
                  setVerificationQuestion(response.data.verification_question);
                  setResetStep(1);
                });
                return;
              }

              if (resetStep === 1) {
                void runApiAction(
                  'password-reset',
                  () => apiClient.resetPassword(username, resetForm.getFieldValue('verification_answer')),
                  (response) => {
                    setTemporaryPassword(response.data.password);
                    setResetStep(2);
                  },
                );
                return;
              }
              navigate('/login');
            }}
          >
            {loadingKey === 'password-question' || loadingKey === 'password-reset' ? (
              <InlineLoading label={loadingKey === 'password-question' ? '질문 확인 중' : '재설정 중'} />
            ) : resetStep === 0 ? (
              '질문 확인'
            ) : resetStep === 1 ? (
              '재설정'
            ) : (
              '로그인으로 이동'
            )}
          </Button>
        </Form>
      }
    />
  );
}
