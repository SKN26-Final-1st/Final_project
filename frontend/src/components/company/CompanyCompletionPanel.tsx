import { Divider, List, Progress } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { palette } from '../../data/appConfig';
import type { CompanyProfile } from '../../api/adapters';

type CompanyCompletionPanelProps = {
  company: CompanyProfile;
};

export function CompanyCompletionPanel({ company }: CompanyCompletionPanelProps) {
  return (
    <>
      <Progress percent={company.completion} strokeColor={palette.accent} />
      <Divider />
      <List
        dataSource={company.employStyle}
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
