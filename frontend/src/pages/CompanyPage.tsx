import { useEffect } from 'react';
import { Button, Col, Form, Row, Space } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { CompanyCompletionPanel } from '../components/company/CompanyCompletionPanel';
import { CompanyProfileForm, type CompanyProfileFormValues } from '../components/company/CompanyProfileForm';
import { InlineLoading } from '../components/common/InlineLoading';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { CompanyProfile } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import { queryKeys } from '../api/queryKeys';
import { useAppDataQuery } from '../hooks/useAppDataQuery';
import type { RunApiAction, ShowAlert } from '../types/app';
import { pageSectionGutter } from '../utils/layout';

type CompanyPageProps = {
  loadingKey: string | null;
  runApiAction: RunApiAction;
  showAlert: ShowAlert;
};

function toCompanyFormValues(company: CompanyProfile): CompanyProfileFormValues {
  return {
    company_name: company.name,
    employee_count: company.employeeCount,
    team_composition: company.teamComposition,
    company_description: company.description,
    employ_style: company.employStyle,
  };
}

export function CompanyPage({ loadingKey, runApiAction, showAlert }: CompanyPageProps) {
  const [form] = Form.useForm<CompanyProfileFormValues>();
  const queryClient = useQueryClient();
  const { data } = useAppDataQuery();
  const company = data?.company;
  const initialValues = company
    ? toCompanyFormValues(company)
    : {
        company_name: '',
        employee_count: 0,
        team_composition: [],
        company_description: '',
        employ_style: [],
      };

  useEffect(() => {
    if (company) {
      form.setFieldsValue(toCompanyFormValues(company));
    }
  }, [company, form]);

  if (!company) {
    return <EmptyState description="회사 정보를 불러오지 못했습니다." />;
  }

  const saveCompany = async () => {
    const values = await form.validateFields();
    await runApiAction('company-save', () => apiClient.saveCompanyProfile(values), () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appData() });
    });
  };

  return (
    <div className="company-page viewport-page">
      <PageTitle
        eyebrow="Company"
        title="회사 정보 입력"
        description="회사 프로필과 핵심 가치를 JD·자기소개서 분석 기준으로 관리합니다."
        actions={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                form.setFieldsValue(initialValues);
                showAlert({ type: 'info', message: '입력값을 초기화했습니다.' });
              }}
            >
              초기화
            </Button>
            <Button
              type="primary"
              icon={loadingKey === 'company-save' ? undefined : <SaveOutlined />}
              disabled={loadingKey === 'company-save'}
              onClick={() => void saveCompany()}
            >
              {loadingKey === 'company-save' ? <InlineLoading label="저장 중" /> : '저장'}
            </Button>
          </Space>
        }
      />
      <Row className="section-row split-editor-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={15}>
          <SectionCard className="scroll-card-body" title="회사 프로필">
            <CompanyProfileForm form={form} initialValues={initialValues} />
          </SectionCard>
        </Col>
        <Col xs={24} xl={9}>
          <SectionCard className="scroll-card-body" title="입력 완성도">
            <CompanyCompletionPanel company={company} showAlert={showAlert} />
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
