import { Avatar, Progress } from 'antd';
import { CreditCardOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import type { AppRoute } from '../../data/appConfig';
import type { NavigationProps } from './navigationTypes';
import { getInitials } from './navigationUtils';

type AccountMenuProps = Omit<NavigationProps, 'route' | 'mode'> & {
  onClose: () => void;
};

export function AccountMenu({
  creditPercent,
  profile,
  themeSwitch,
  navigate,
  onLogout,
  showAlert,
  onClose,
}: AccountMenuProps) {
  const displayName = profile?.displayName ?? '채용 담당자';
  const email = profile?.email ?? 'recruiter@humour.ai';
  const creditPointText = `${profile?.credit ?? 0}pt`;

  const moveTo = (nextRoute: AppRoute) => {
    onClose();
    navigate(nextRoute);
  };

  return (
    <div className="account-menu">
      <div className="account-menu-head">
        <Avatar size={42} src={profile?.avatarUrl}>
          {getInitials(displayName)}
        </Avatar>
        <div>
          <span>마이페이지</span>
          <strong>{displayName}</strong>
          <small>{email}</small>
        </div>
      </div>
      <div className="account-theme-row">
        <span>
          <SettingOutlined />
          라이트 / 다크 모드
        </span>
        {themeSwitch}
      </div>
      <div className="account-credit-panel">
        <div>
          <CreditCardOutlined />
          <span>분석 크레딧</span>
          <strong>{creditPointText}</strong>
        </div>
        <Progress percent={creditPercent} showInfo={false} />
        <button
          type="button"
          className="account-credit-link"
          onClick={() => {
            onClose();
            showAlert({ type: 'info', message: '크레딧 충전 문의 상태를 표시했습니다.' });
          }}
        >
          충전 문의
        </button>
      </div>
      <button type="button" className="account-menu-item" onClick={() => moveTo('/mypage')}>
        <UserOutlined />
        <span>
          <strong>마이페이지 바로가기</strong>
          <small>프로필과 보안 설정</small>
        </span>
      </button>
      <button
        type="button"
        className="account-menu-item danger"
        onClick={() => {
          onClose();
          onLogout();
        }}
      >
        <LogoutOutlined />
        <span>
          <strong>로그아웃</strong>
          <small>현재 세션 종료</small>
        </span>
      </button>
    </div>
  );
}
