import { Button, Col, Form, Input, Progress, Row, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { JdItem } from '../../api/adapters';
import type { Navigate, ShowAlert } from '../../types/app';

const { TextArea } = Input;

type JdEditorPanelProps = {
  selectedJd: JdItem;
  navigate: Navigate;
  showAlert: ShowAlert;
};

export function JdEditorPanel({ selectedJd, navigate, showAlert }: JdEditorPanelProps) {
  return (
    <Form layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="JD명">
            <Input value={selectedJd.title} readOnly />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="전공 요건">
            <Input value={selectedJd.major} readOnly />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="주요 업무">
        <TextArea rows={4} value={selectedJd.summary} readOnly />
      </Form.Item>
      <Form.Item label="필수 기술">
        <Space wrap>
          {selectedJd.stack.map((stack) => (
            <Tag className="large-tag" key={stack}>
              {stack}
            </Tag>
          ))}
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => showAlert({ type: 'info', message: '기술 스택 추가 입력은 API 연동 단계에서 저장됩니다.' })}
          >
            추가
          </Button>
        </Space>
      </Form.Item>
      <Form.Item label="우대 기술">
        <Space wrap>
          {selectedJd.preferredStack.map((stack) => (
            <Tag className="large-tag" key={stack}>
              {stack}
            </Tag>
          ))}
        </Space>
      </Form.Item>
      <Form.Item label="채용 배경">
        <TextArea rows={3} value={selectedJd.hiringReason} readOnly />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <div className="mini-panel">
            <span className="form-stat-label">평균 등급 점수</span>
            <Progress percent={selectedJd.fit} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="mini-panel">
            <span className="form-stat-label">학력</span>
            <strong>{selectedJd.educationLevel}</strong>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="mini-panel">
            <span className="form-stat-label">고용 형태</span>
            <strong>{selectedJd.employmentType}</strong>
          </div>
        </Col>
        <Col span={24}>
          <div className="inline-action-box">
            <span>모집 공고 작성 화면으로 연결</span>
            <Button onClick={() => navigate('/recruitment-post')} type="primary" ghost>
              공고 작성
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
}
