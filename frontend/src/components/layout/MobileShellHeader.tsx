import { useState } from 'react';
import { Drawer, Popover } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { AccountMenu } from './AccountMenu';
import { MenuItems } from './MenuItems';
import type { NavigationProps } from './navigationTypes';
import { getInitials } from './navigationUtils';

export function MobileShellHeader(props: NavigationProps) {
  const { route, mode, creditPercent, profile, themeSwitch, navigate, showAlert } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const displayName = profile?.displayName ?? '채용 담당자';

  return (
    <>
      <header className="mobile-shell-header">
        <button type="button" className="mobile-nav-trigger" onClick={() => setDrawerOpen(true)} aria-label="메뉴 열기">
          <MenuOutlined />
        </button>
        <button type="button" className="mobile-brand-logo" onClick={() => navigate('/dashboard')} aria-label="대시보드로 이동">
          <img src={mode === 'dark' ? '/assets/humour-logo-dark.png' : '/assets/humour-logo-light.png'} alt="HumouR" />
        </button>
        <Popover
          rootClassName="account-popover mobile-account-popover"
          placement="bottomRight"
          trigger="click"
          arrow={false}
          open={accountOpen}
          onOpenChange={setAccountOpen}
          content={
            <AccountMenu
              creditPercent={creditPercent}
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
            className={`mobile-account-trigger ${route === '/mypage' ? 'active' : ''}`}
            aria-label="마이페이지 메뉴 열기"
          >
            <span className="mobile-profile-avatar" aria-hidden="true">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : getInitials(displayName)}
            </span>
          </button>
        </Popover>
      </header>
      <Drawer
        rootClassName="mobile-nav-drawer"
        placement="left"
        size="min(330px, calc(100vw - 28px))"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={null}
        getContainer={() => (document.querySelector('.app-root') as HTMLElement) ?? document.body}
      >
        <button
          type="button"
          className="brand-button mobile-drawer-brand"
          onClick={() => {
            setDrawerOpen(false);
            navigate('/dashboard');
          }}
          aria-label="대시보드로 이동"
        >
          <img src={mode === 'dark' ? '/assets/humour-logo-dark.png' : '/assets/humour-logo-light.png'} alt="HumouR" />
        </button>
        <div className="side-section mobile-drawer-menu">
          <span className="side-label">Main menu</span>
          <MenuItems route={route} navigate={navigate} onNavigate={() => setDrawerOpen(false)} />
        </div>
      </Drawer>
    </>
  );
}
