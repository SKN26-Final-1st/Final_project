import { Button, Col, Progress, Row, Statistic } from 'antd';
import { palette } from '../../data/mockData';
import type { CompanyProfile } from '../../api/adapters';
import type { Navigate } from '../../types/app';

type CompanySummaryPanelProps = {
  company: CompanyProfile;
  navigate: Navigate;
};

export function CompanySummaryPanel({ company, navigate }: CompanySummaryPanelProps) {
  return (
    <>
      <div className="section-extra-row">
        <Button type="link" onClick={() => navigate('/company')}>
          수정
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Statistic title="회사명" value={company.name} />
        </Col>
        <Col xs={24} md={8}>
          <Statistic title="직원 수" value={company.employeeCount} suffix="명" />
        </Col>
        <Col xs={24} md={8}>
          <Progress percent={company.completion} strokeColor={palette.accent} />
        </Col>
      </Row>
    </>
  );
}
