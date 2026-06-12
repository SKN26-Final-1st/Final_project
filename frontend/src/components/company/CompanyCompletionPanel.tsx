import { Button, Divider, List, Progress } from 'antd';
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import { palette } from '../../data/mockData';
import type { CompanyProfile } from '../../api/adapters';
import type { ShowAlert } from '../../types/app';

type CompanyCompletionPanelProps = {
  company: CompanyProfile;
  showAlert: ShowAlert;
};

export function CompanyCompletionPanel({ company, showAlert }: CompanyCompletionPanelProps) {
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
      <Button
        block
        type="primary"
        ghost
        icon={<EditOutlined />}
        onClick={() => showAlert({ type: 'info', message: '수정 완료 상태로 전환했습니다.' })}
      >
        수정 완료
      </Button>
    </>
  );
}
