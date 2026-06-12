import { useState, type ReactNode } from 'react';
import { Button, Col, Flex, Form, Input, Row, Steps } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, LoginOutlined } from '@ant-design/icons';
import { InlineLoading } from '../components/common/InlineLoading';
import { AuthScreen } from '../components/layout/AuthScreen';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction, ShowAlert, ThemeMode } from '../types/app';

type AuthPageBaseProps = {
  mode: ThemeMode;
  navigate: Navigate;
  themeSwitch: ReactNode;
  loadingKey: string | null;
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
          onFinish={(values) =>
            void runApiAction(
              'login',
              () => apiClient.login(values.username, values.password),
              () => onLoginSuccess?.(),
            )
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
  runApiAction,
  showAlert,
}: SignupPageProps) {
  const [signupForm] = Form.useForm<SignupValues>();
  const [checkingUsername, setCheckingUsername] = useState(false);

  const checkUsername = async () => {
    const { username } = await signupForm.validateFields(['username']);

    setCheckingUsername(true);

    try {
      const response = await apiClient.checkSignupId(username);

      showAlert({
        type: response.data.available ? 'success' : 'warning',
        message: response.message ?? '아이디 중복 확인을 완료했습니다.',
      });
    } catch (error) {
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : '아이디 중복 확인에 실패했습니다.',
      });
    } finally {
      setCheckingUsername(false);
    }
  };

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
          onFinish={(values) =>
            void runApiAction('signup-complete', () => apiClient.completeSignup(values), () => navigate('/login'))
          }
        >
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                label="아이디"
                name="username"
                rules={[{ required: true, whitespace: true, message: '아이디를 입력하세요.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="확인">
                <Button
                  block
                  disabled={checkingUsername}
                  onClick={() => void checkUsername()}
                >
                  {checkingUsername ? <InlineLoading label="확인 중" /> : '중복 확인'}
                </Button>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="담당자명" name="name" rules={[{ required: true, message: '담당자명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="비밀번호" name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="본인확인 질문"
            name="verification_question"
            rules={[{ required: true, message: '본인확인 질문을 입력하세요.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="본인확인 답변"
            name="verification_answer"
            rules={[{ required: true, message: '본인확인 답변을 입력하세요.' }]}
          >
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
  runApiAction,
  resetStep,
  setResetStep,
}: PasswordResetPageProps) {
  const [resetForm] = Form.useForm<{ username: string; verification_answer: string }>();
  const [verificationQuestion, setVerificationQuestion] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const moveNext = async () => {
    if (resetStep === 0) {
      const { username } = await resetForm.validateFields(['username']);
      await runApiAction('password-question', () => apiClient.getPasswordQuestion(username), (response) => {
        setVerificationQuestion(response.data.verification_question);
        setResetStep(1);
      });
      return;
    }

    if (resetStep === 1) {
      const { username, verification_answer } = await resetForm.validateFields(['username', 'verification_answer']);
      await runApiAction('password-reset', () => apiClient.resetPassword(username, verification_answer), (response) => {
        setTemporaryPassword(response.data.password);
        setResetStep(2);
      });
      return;
    }

    navigate('/login');
  };

  const stepContents = [
    <Form.Item label="아이디" name="username" key="id" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
      <Input />
    </Form.Item>,
    <div key="question">
      <Form.Item label="본인확인 질문">
        <Input value={verificationQuestion || '아이디 확인 후 질문을 불러옵니다.'} readOnly />
      </Form.Item>
      <Form.Item
        label="본인확인 답변"
        name="verification_answer"
        rules={[{ required: true, message: '본인확인 답변을 입력하세요.' }]}
      >
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
        >
          <Steps size="small" current={resetStep} items={[{ title: 'ID' }, { title: '질문' }, { title: '변경' }]} />
          <div className="step-panel">{stepContents[resetStep]}</div>
          <Button
            type="primary"
            block
            disabled={loadingKey === 'password-question' || loadingKey === 'password-reset'}
            onClick={() => void moveNext()}
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
