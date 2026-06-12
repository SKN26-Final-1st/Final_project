import { Button, Col, Row } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { AccountSettingsForm } from '../components/mypage/AccountSettingsForm';
import { CompanySummaryPanel } from '../components/mypage/CompanySummaryPanel';
import { ProfileSummaryCard } from '../components/mypage/ProfileSummaryCard';
import { SecuritySettingsForm } from '../components/mypage/SecuritySettingsForm';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { CompanyProfile, UserProfile } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction } from '../types/app';

type MyPageProps = {
  profile: UserProfile;
  company: CompanyProfile;
  navigate: Navigate;
  runApiAction: RunApiAction;
};

export function MyPage({ profile, company, navigate, runApiAction }: MyPageProps) {
  return (
    <>
      <PageTitle
        eyebrow="My Page"
        title="마이페이지"
        description="프로필, 계정 수정, 보안 설정과 회사 정보 요약을 한 화면에서 관리합니다."
        actions={
          <Button type="primary" icon={<SaveOutlined />} onClick={() => void runApiAction('profile-save', apiClient.saveUserProfile)}>
            저장
          </Button>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={8}>
          <SectionCard title="프로필">
            <ProfileSummaryCard profile={profile} />
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <SectionCard title="계정 정보">
                <AccountSettingsForm profile={profile} />
              </SectionCard>
            </Col>
            <Col xs={24} lg={12}>
              <SectionCard title="보안 설정">
                <SecuritySettingsForm />
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
