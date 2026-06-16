import { useEffect } from 'react';
import { Button, Col, Form, Row } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { SaveOutlined } from '@ant-design/icons';
import { AccountSettingsForm, type AccountSettingsFormValues } from '../components/mypage/AccountSettingsForm';
import { CompanySummaryPanel } from '../components/mypage/CompanySummaryPanel';
import { ProfileSummaryCard } from '../components/mypage/ProfileSummaryCard';
import { SecuritySettingsForm, type SecuritySettingsFormValues } from '../components/mypage/SecuritySettingsForm';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { UserProfile } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import { queryKeys } from '../api/queryKeys';
import { useAppDataQuery } from '../hooks/useAppDataQuery';
import type { Navigate, RunApiAction } from '../types/app';
import { pageSectionGutter } from '../utils/layout';

type MyPageProps = {
  loadingKey: string | null;
  navigate: Navigate;
  runApiAction: RunApiAction;
};

function toAccountFormValues(profile: UserProfile): AccountSettingsFormValues {
  return {
    username: profile.username,
    name: profile.displayName,
    credit: profile.credit,
    subscribe: profile.subscribe,
    verification_question: profile.verificationQuestion,
  };
}

export function MyPage({
  loadingKey,
  navigate,
  runApiAction,
}: MyPageProps) {
  const [accountForm] = Form.useForm<AccountSettingsFormValues>();
  const [securityForm] = Form.useForm<SecuritySettingsFormValues>();
  const queryClient = useQueryClient();
  const { data } = useAppDataQuery();
  const profile = data?.userProfile;
  const company = data?.company;
  const accountInitialValues = profile
    ? toAccountFormValues(profile)
    : {
        username: '',
        name: '',
        credit: 0,
        subscribe: false,
        verification_question: '',
      };

  useEffect(() => {
    if (profile) {
      accountForm.setFieldsValue(toAccountFormValues(profile));
      securityForm.resetFields();
    }
  }, [accountForm, profile, securityForm]);

  if (!profile || !company) {
    return null;
  }

  const saveProfile = () => {
    let passwordChanged = false;

    return runApiAction(
      'profile-save',
      async () => {
        const accountValues = await accountForm.validateFields();
        const securityValues = await securityForm.validateFields();
        const body: {
          name: string;
          verification_question: string;
          formal_password?: string;
          password?: string;
        } = {
          name: accountValues.name,
          verification_question: accountValues.verification_question,
        };

        if (securityValues.password) {
          if (!securityValues.formal_password) {
            throw new Error('새 비밀번호를 저장하려면 현재 비밀번호가 필요합니다.');
          }

          passwordChanged = true;
          body.formal_password = securityValues.formal_password;
          body.password = securityValues.password;
        }

        const response = await apiClient.saveUserProfile(body);

        if (passwordChanged && securityValues.password) {
          await apiClient.login(profile.username, securityValues.password);

          return {
            ...response,
            message: '비밀번호가 변경되었습니다. 로그인 상태가 유지됩니다.',
          };
        }

        return response;
      },
      () => {
        if (passwordChanged) {
          securityForm.resetFields();
          void queryClient.invalidateQueries({ queryKey: queryKeys.appData() });
          return;
        }

        void queryClient.invalidateQueries({ queryKey: queryKeys.appData() });
      },
    );
  };

  return (
    <>
      <PageTitle
        eyebrow="My Page"
        title="마이페이지"
        description="프로필, 계정 수정, 보안 설정과 회사 정보 요약을 한 화면에서 관리합니다."
        actions={
          <Button
            type="primary"
            icon={loadingKey === 'profile-save' ? undefined : <SaveOutlined />}
            disabled={loadingKey === 'profile-save'}
            onClick={() => void saveProfile()}
          >
            {loadingKey === 'profile-save' ? <InlineLoading label="저장 중" /> : '저장'}
          </Button>
        }
      />
      <Row className="section-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={8}>
          <SectionCard title="프로필">
            <ProfileSummaryCard profile={profile} />
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <Row className="section-row" gutter={pageSectionGutter}>
            <Col xs={24} lg={12}>
              <SectionCard title="계정 정보">
                <AccountSettingsForm form={accountForm} initialValues={accountInitialValues} />
              </SectionCard>
            </Col>
            <Col xs={24} lg={12}>
              <SectionCard title="보안 설정">
                <SecuritySettingsForm form={securityForm} />
              </SectionCard>
            </Col>
            <Col span={24}>
              <SectionCard title="회사 정보 요약">
                <CompanySummaryPanel company={company} navigate={navigate} />
              </SectionCard>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
}
