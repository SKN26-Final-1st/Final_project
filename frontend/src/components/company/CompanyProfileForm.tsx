import { Col, Form, Input, InputNumber, Row, type FormInstance } from 'antd';
import { CollapsibleEditableStringListField } from '../common/CollapsibleEditableStringListField';

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
      <CollapsibleEditableStringListField
        form={form}
        name="team_composition"
        label="팀 구성"
        itemLabel="팀 구성"
        placeholder="팀을 입력하세요"
        addLabel="팀 추가"
        emptyText="아직 입력된 팀 구성이 없습니다."
      />
      <CollapsibleEditableStringListField
        form={form}
        name="employ_style"
        label="선호 인재상"
        itemLabel="선호 인재상"
        placeholder="선호 인재상을 입력하세요"
        addLabel="인재상 추가"
        emptyText="아직 입력된 선호 인재상이 없습니다."
      />
    </Form>
  );
}
