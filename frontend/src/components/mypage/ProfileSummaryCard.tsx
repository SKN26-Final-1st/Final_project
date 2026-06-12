import { Avatar, Divider, List, Tag } from 'antd';
import type { UserProfile } from '../../api/adapters';

type ProfileSummaryCardProps = {
  profile: UserProfile;
};

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  return (
    <>
      <div className="profile-card">
        <Avatar size={76}>{getInitials(profile.displayName)}</Avatar>
        <strong>{profile.displayName}</strong>
        <span>
          {profile.companyName} · {profile.roleName}
        </span>
        <Tag color={profile.subscribe ? 'green' : 'default'}>{profile.subscribe ? '구독 중' : '구독 만료'}</Tag>
      </div>
      <Divider />
      <List
        dataSource={[
          `계정 ID ${profile.username}`,
          `구독 종료 ${profile.subscribeExpirationText}`,
          `분석 크레딧 ${profile.credit}pt`,
        ]}
        renderItem={(item) => <List.Item>{item}</List.Item>}
      />
    </>
  );
}
