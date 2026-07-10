import { Divider, List, Progress } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { CompanyProfile } from '../../api/adapters';

type CompanyCompletionPanelProps = {
  company: CompanyProfile;
};

export function CompanyCompletionPanel({ company }: CompanyCompletionPanelProps) {
  return (
    <>
      <Progress percent={company.completion} strokeColor="var(--accent)" />
      <Divider />
      <List
        dataSource={company.employStyle}
        locale={{ emptyText: '등록된 선호 인재상이 없습니다.' }}
        renderItem={(item) => (
          <List.Item>
            <CheckCircleOutlined className="success-icon" />
            {item}
          </List.Item>
        )}
      />
    </>
  );
}
