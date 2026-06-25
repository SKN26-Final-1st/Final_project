import { useState } from 'react';
import { Avatar, Popover } from 'antd';
import { PushpinFilled, PushpinOutlined, SettingOutlined } from '@ant-design/icons';
import { AccountMenu } from './AccountMenu';
import { MenuItems } from './MenuItems';
import { MobileShellHeader } from './MobileShellHeader';
import type { NavigationProps } from './navigationTypes';
import { getInitials } from './navigationUtils';

export { MobileShellHeader };

export function SidebarNav(props: NavigationProps) {
  const {
    allowedRoutes,
    authMode,
    homeRoute = '/dashboard',
    route,
    mode,
    creditPercent,
    profile,
    themeSwitch,
    navigate,
    showAlert,
  } = props;
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const displayName = authMode === 'apiKey' ? 'API Key 사용자' : profile?.displayName ?? '채용 담당자';
  const email = authMode === 'apiKey' ? '제한 접근 모드' : profile?.email ?? 'recruiter@humour.ai';

  return (
    <nav
      className="sidebar desktop-shell-nav"
      data-account-open={accountOpen ? 'true' : 'false'}
      data-sidebar-pinned={sidebarPinned ? 'true' : 'false'}
      aria-label="주요 페이지"
    >
      <div className="desktop-shell-nav-inner">
        <div className="sidebar-brand-row">
          <button
            type="button"
            className="brand-button"
            onClick={(event) => {
              event.currentTarget.blur();
              navigate(homeRoute);
            }}
            aria-label="홈으로 이동"
          >
            <img
              className="brand-logo-full"
              src={mode === 'dark' ? '/assets/humour-logo-dark.png' : '/assets/humour-logo-light.png'}
              alt="HumouR"
            />
            <img className="brand-logo-mark" src="/assets/humour-app-icon.png" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`sidebar-pin-button ${sidebarPinned ? 'active' : ''}`}
            aria-label={sidebarPinned ? '사이드바 고정 해제' : '사이드바 고정'}
            aria-pressed={sidebarPinned}
            onClick={(event) => {
              setSidebarPinned((current) => !current);
              event.currentTarget.blur();
            }}
          >
            {sidebarPinned ? <PushpinFilled /> : <PushpinOutlined />}
            <span>핀</span>
          </button>
        </div>
        <div className="side-section">
          <span className="side-label">Main menu</span>
          <MenuItems allowedRoutes={allowedRoutes} route={route} navigate={navigate} />
        </div>
        <div className="sidebar-account-wrap">
          <Popover
            rootClassName="account-popover"
            placement="rightBottom"
            trigger="click"
            arrow={false}
            open={accountOpen}
            onOpenChange={setAccountOpen}
            content={
              <AccountMenu
                creditPercent={creditPercent}
                authMode={authMode}
                profile={profile}
                themeSwitch={themeSwitch}
                navigate={navigate}
                onLogout={props.onLogout}
                showAlert={showAlert}
                onClose={() => setAccountOpen(false)}
              />
            }
            getPopupContainer={(triggerNode) => (triggerNode.closest('.app-root') as HTMLElement) ?? document.body}
          >
            <button
              type="button"
              className={`sidebar-account-button ${route === '/mypage' ? 'active' : ''}`}
              aria-label="계정 메뉴 열기"
            >
              <Avatar size={38} src={profile?.avatarUrl}>
                {getInitials(displayName)}
              </Avatar>
              <span className="sidebar-account-copy">
                <strong>{displayName}</strong>
                <small>{email}</small>
              </span>
              <SettingOutlined className="sidebar-account-cue" aria-hidden="true" />
            </button>
          </Popover>
        </div>
      </div>
    </nav>
  );
}
