import { Button, Col, Form, Input, InputNumber, Row, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CompanyProfile } from '../../api/adapters';
import type { ShowAlert } from '../../types/app';

const { TextArea } = Input;

type CompanyProfileFormProps = {
  company: CompanyProfile;
  showAlert: ShowAlert;
};

export function CompanyProfileForm({ company, showAlert }: CompanyProfileFormProps) {
  return (
    <Form layout="vertical" initialValues={company}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="회사명" name="name">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="직원 수" name="employeeCount">
            <InputNumber min={0} className="full-width-control" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="회사 소개" name="description">
        <TextArea rows={5} />
      </Form.Item>
      <Form.Item label="팀 구성">
        <Space wrap>
          {company.teamComposition.map((team) => (
            <Tag className="large-tag" closable key={team}>
              {team}
            </Tag>
          ))}
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() =>
              showAlert({
                type: 'info',
                message: '팀 구성 추가 입력은 API 연동 단계에서 저장됩니다.',
              })
            }
          >
            팀 추가
          </Button>
        </Space>
      </Form.Item>
      <Form.Item label="선호 인재상">
        <Space wrap>
          {company.employStyle.map((value) => (
            <Tag className="large-tag" closable key={value}>
              {value}
            </Tag>
          ))}
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={() =>
              showAlert({
                type: 'info',
                message: '선호 인재상 추가 입력은 API 연동 단계에서 저장됩니다.',
              })
            }
          >
            인재상 추가
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
