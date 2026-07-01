import { useState } from 'react';
import { Button, Form, Input, Steps } from 'antd';
import { InlineLoading } from '../../components/common/InlineLoading';
import { AuthScreen } from '../../components/layout/AuthScreen';
import { apiClient } from '../../api/backendClient';
import type { ShowAlert } from '../../types/app';
import type { AuthPageBaseProps } from './types';

type PasswordResetPageProps = AuthPageBaseProps & {
  resetStep: number;
  setResetStep: (step: number | ((current: number) => number)) => void;
  showAlert: ShowAlert;
};

export function PasswordResetPage({
  mode,
  navigate,
  loadingKey,
  runApiAction,
  resetStep,
  setResetStep,
}: PasswordResetPageProps) {
  const [resetForm] = Form.useForm<{ username: string; verification_answer: string }>();
  const [verificationQuestion, setVerificationQuestion] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [checkingQuestion, setCheckingQuestion] = useState(false);

  const moveNext = async () => {
    if (resetStep === 0) {
      const { username } = await resetForm.validateFields(['username']);
      setCheckingQuestion(true);
      resetForm.setFields([{ name: 'username', errors: [] }]);

      try {
        const response = await apiClient.getPasswordQuestion(username);
        setVerificationQuestion(response.data.verification_question);
        setResetStep(1);
      } catch {
        resetForm.setFields([
          {
            name: 'username',
            errors: ['입력한 아이디를 찾을 수 없습니다.'],
          },
        ]);
      } finally {
        setCheckingQuestion(false);
      }
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
      cardExtra={
        <button type="button" className="auth-text-link auth-card-return-link" onClick={() => navigate('/login')}>
          로그인으로
        </button>
      }
      title="단계형 재설정 플로우로 인증 화면 상태를 확인합니다."
      cardTitle="비밀번호 찾기"
      card={
        <Form
          form={resetForm}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, 'username')) {
              resetForm.setFields([{ name: 'username', errors: [] }]);
            }
          }}
        >
          <Steps size="small" current={resetStep} items={[{ title: 'ID' }, { title: '질문' }, { title: '변경' }]} />
          <div className="step-panel">{stepContents[resetStep]}</div>
          <Button
            type="primary"
            block
            disabled={checkingQuestion || loadingKey === 'password-reset'}
            onClick={() => void moveNext()}
          >
            {checkingQuestion || loadingKey === 'password-reset' ? (
              <InlineLoading label={checkingQuestion ? '질문 확인 중' : '재설정 중'} />
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
