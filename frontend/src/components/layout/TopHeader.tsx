import type { ReactNode } from 'react';
import { Button, Input, Layout, Select, Space } from 'antd';
import { LogoutOutlined, SearchOutlined } from '@ant-design/icons';
import { mainMenu, type AppRoute } from '../../data/mockData';
import type { Navigate } from '../../types/app';

const { Header } = Layout;

type TopHeaderProps = {
  route: AppRoute;
  themeSwitch: ReactNode;
  navigate: Navigate;
};

export function TopHeader({ route, themeSwitch, navigate }: TopHeaderProps) {
  return (
    <Header className="top-header">
      <div className="top-title">
        <img src="/assets/humour-app-icon.png" alt="" />
        <span>{mainMenu.find((item) => item.route === route)?.label}</span>
      </div>
      <Input
        className="top-search"
        prefix={<SearchOutlined />}
        placeholder="지원자, JD, 분석 리포트 검색"
        aria-label="검색"
      />
      <Select
        className="mobile-route-select"
        value={route}
        onChange={(value) => navigate(value)}
        options={mainMenu.map((item) => ({ value: item.route, label: item.label }))}
        aria-label="화면 선택"
      />
      <Space className="top-actions">
        {themeSwitch}
        <Button className="logout-button" icon={<LogoutOutlined />} onClick={() => navigate('/login')}>
          <span className="logout-text">로그아웃</span>
        </Button>
      </Space>
    </Header>
  );
}
