import { Col, Form, Input, InputNumber, Row, type FormInstance } from 'antd';
import { EditableStringList } from '../common/EditableStringList';

const { TextArea } = Input;

export type CompanyProfileFormValues = {
  company_name: string;
  employee_count: number;
  team_composition: string[];
  company_description: string;
  employ_style: string[];
};

type CompanyProfileFormProps = {
  form: FormInstance<CompanyProfileFormValues>;
  initialValues: CompanyProfileFormValues;
};

export function CompanyProfileForm({ form, initialValues }: CompanyProfileFormProps) {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="회사명" name="company_name">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="직원 수" name="employee_count">
            <InputNumber min={0} className="full-width-control" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="회사 소개" name="company_description">
        <TextArea rows={5} />
      </Form.Item>
      <Form.Item label="팀 구성">
        <EditableStringList
          name="team_composition"
          itemLabel="팀 구성"
          placeholder="팀을 입력하세요"
          addLabel="팀 추가"
        />
      </Form.Item>
      <Form.Item label="선호 인재상">
        <EditableStringList
          name="employ_style"
          itemLabel="선호 인재상"
          placeholder="선호 인재상을 입력하세요"
          addLabel="인재상 추가"
        />
      </Form.Item>
    </Form>
  );
}
