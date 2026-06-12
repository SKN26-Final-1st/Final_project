import { Button, Col, Row, Space } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { CompanyCompletionPanel } from '../components/company/CompanyCompletionPanel';
import { CompanyProfileForm } from '../components/company/CompanyProfileForm';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { CompanyProfile } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { RunApiAction, ShowAlert } from '../types/app';

type CompanyPageProps = {
  company: CompanyProfile;
  loadingKey: string | null;
  runApiAction: RunApiAction;
  showAlert: ShowAlert;
};

export function CompanyPage({ company, loadingKey, runApiAction, showAlert }: CompanyPageProps) {
  return (
    <>
      <PageTitle
        eyebrow="Company"
        title="회사 정보 입력"
        description="회사 프로필과 핵심 가치를 JD·자기소개서 분석 기준으로 관리합니다."
        actions={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => showAlert({ type: 'info', message: '입력값을 초기화했습니다.' })}>
              초기화
            </Button>
            <Button
              type="primary"
              icon={loadingKey === 'company-save' ? undefined : <SaveOutlined />}
              disabled={loadingKey === 'company-save'}
              onClick={() => void runApiAction('company-save', apiClient.saveCompanyProfile)}
            >
              {loadingKey === 'company-save' ? <InlineLoading label="저장 중" /> : '저장'}
            </Button>
          </Space>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={15}>
          <SectionCard title="회사 프로필">
            <CompanyProfileForm company={company} showAlert={showAlert} />
          </SectionCard>
        </Col>
        <Col xs={24} xl={9}>
          <SectionCard title="입력 완성도">
            <CompanyCompletionPanel company={company} showAlert={showAlert} />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
