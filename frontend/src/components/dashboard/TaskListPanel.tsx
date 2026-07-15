import { Col, Row, type RowProps } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { SectionCard } from '../common/SectionCard';

type TaskListPanelProps = {
  tasks: string[];
};

const dashboardGutter: RowProps['gutter'] = [
  { xs: 16, lg: 22, xl: 24 },
  { xs: 16, lg: 22, xl: 24 },
];

export function TaskListPanel({ tasks }: TaskListPanelProps) {
  return (
    <SectionCard title="오늘의 작업" className="section-row">
      <Row gutter={dashboardGutter}>
        {tasks.map((task, index) => (
          <Col xs={24} md={12} xl={6} key={task}>
            <div className="task-item" style={{ animationDelay: `${index * 70}ms` }}>
              <CheckCircleOutlined />
              <span>{task}</span>
            </div>
          </Col>
        ))}
      </Row>
    </SectionCard>
  );
}
