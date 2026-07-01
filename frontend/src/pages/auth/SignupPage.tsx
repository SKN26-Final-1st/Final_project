import { useState } from 'react';
import { Button, Col, Form, Input, Row } from 'antd';
import { InlineLoading } from '../../components/common/InlineLoading';
import { AuthScreen } from '../../components/layout/AuthScreen';
import { apiClient } from '../../api/backendClient';
import type { ShowAlert } from '../../types/app';
import type { AuthPageBaseProps } from './types';

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

export function SignupPage({ mode, navigate, loadingKey, runApiAction, showAlert }: SignupPageProps) {
  const [signupForm] = Form.useForm<SignupValues>();
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkedUsername, setCheckedUsername] = useState<string | null>(null);
  const usernameValue = Form.useWatch('username', signupForm);
  const currentUsername = typeof usernameValue === 'string' ? usernameValue.trim() : '';
  const isUsernameVerified = Boolean(currentUsername && checkedUsername === currentUsername);

  const checkUsername = async () => {
    const { username } = await signupForm.validateFields(['username']);
    const trimmedUsername = username.trim();

    setCheckingUsername(true);

    try {
      const response = await apiClient.checkSignupId(trimmedUsername);
      setCheckedUsername(response.data.available === true ? trimmedUsername : null);

      showAlert({
        type: response.data.available ? 'success' : 'warning',
        message: response.message ?? '아이디 중복 확인이 완료되었습니다.',
      });
    } catch (error) {
      setCheckedUsername(null);
      showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : '아이디 중복 확인에 실패했습니다.',
      });
    } finally {
      setCheckingUsername(false);
    }
  };

  const completeSignup = (values: SignupValues) => {
    const trimmedUsername = values.username.trim();

    if (checkedUsername !== values.username.trim()) {
      signupForm.setFields([
        {
          name: 'username',
          errors: ['아이디 중복 확인을 완료하세요.'],
        },
      ]);
      showAlert({ type: 'warning', message: '아이디 중복 확인을 완료하세요.' });
      return;
    }

    void runApiAction(
      'signup-complete',
      () => apiClient.completeSignup({ ...values, username: trimmedUsername }),
      () => navigate('/login'),
    );
  };

  return (
    <AuthScreen
      mode={mode}
      nav={navigate}
      cardExtra={
        <button type="button" className="auth-text-link auth-card-return-link" onClick={() => navigate('/login')}>
          돌아가기
        </button>
      }
      title="회사와 지원자 데이터를 한곳에서 관리하는 채용 보조 시스템"
      cardTitle="회원가입"
      card={
        <Form<SignupValues>
          form={signupForm}
          layout="vertical"
          onFinish={completeSignup}
          onValuesChange={(changedValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, 'username')) {
              setCheckedUsername(null);
            }
          }}
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
                <Button block disabled={checkingUsername} onClick={() => void checkUsername()}>
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
          <Button type="primary" block htmlType="submit" disabled={loadingKey === 'signup-complete' || !isUsernameVerified}>
            {loadingKey === 'signup-complete' ? <InlineLoading label="가입 중" /> : '가입 완료'}
          </Button>
        </Form>
      }
    />
  );
}
