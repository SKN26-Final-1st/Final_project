import { Col, Row, Statistic } from 'antd';
import { SectionCard } from '../common/SectionCard';
import type { AdminData } from '../../api/adapters';
import { pageSectionGutter } from '../../utils/layout';

type AdminSummaryCardsProps = {
  summary: AdminData['summary'];
};

export function AdminSummaryCards({ summary }: AdminSummaryCardsProps) {
  return (
    <Row className="section-row" gutter={pageSectionGutter}>
      {summary.map((item) => (
        <Col xs={24} sm={12} xl={6} key={item.label}>
          <SectionCard title={item.label}>
            <Statistic value={item.value} suffix={item.suffix} />
            <p className="muted">{item.helper}</p>
          </SectionCard>
        </Col>
      ))}
    </Row>
  );
}
