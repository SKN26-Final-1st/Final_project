import type { ReactNode } from 'react';
import { Card, Space } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { AppRoute } from '../../data/appConfig';
import type { Navigate, ThemeMode } from '../../types/app';

type AuthScreenProps = {
  mode: ThemeMode;
  nav: Navigate;
  themeSwitch: ReactNode;
  cardExtra?: ReactNode;
  title: string;
  cardTitle: string;
  card: ReactNode;
};

export function AuthScreen({ mode, nav, themeSwitch, cardExtra, title, cardTitle, card }: AuthScreenProps) {
  const goLogin = () => nav('/login' as AppRoute);

  return (
    <div className="auth-screen">
      <header className="auth-header">
        <button type="button" onClick={goLogin} className="auth-logo-button">
          <img src={mode === 'dark' ? '/assets/humour-logo-dark.png' : '/assets/humour-logo-light.png'} alt="HumouR" />
        </button>
        <Space>{themeSwitch}</Space>
      </header>
      <main className="auth-main">
        <section className="auth-copy">
          <span className="eyebrow">HumouR AI</span>
          <h1>{title}</h1>
          <div className="auth-benefits">
            {['회사 정보 기반 분석', 'JD와 자기소개서 연결', '리포트 기반 AI 채팅'].map((item) => (
              <div key={item}>
                <CheckCircleOutlined />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
        <Card className="auth-card" title={cardTitle} extra={cardExtra}>
          {card}
        </Card>
      </main>
    </div>
  );
}
