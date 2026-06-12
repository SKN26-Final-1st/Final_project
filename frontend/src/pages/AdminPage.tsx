import type { CSSProperties, ReactNode } from 'react';
import { Button, Progress, Space, Tag } from 'antd';
import {
  ApiOutlined,
  AuditOutlined,
  CloudSyncOutlined,
  CopyOutlined,
  CreditCardOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { AdminData } from '../api/adapters';
import type { Navigate, ShowAlert } from '../types/app';

type AdminPageProps = {
  admin: AdminData;
  navigate: Navigate;
  showAlert: ShowAlert;
};

type Tone = 'primary' | 'accent' | 'warning' | 'danger';

type AdminMetric = {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  icon: ReactNode;
};

type ProgressStyle = CSSProperties & {
  '--progress': string;
};

const CREDIT_POINT_UNIT = 500;
const TOKEN_PER_POINT = 24.5;

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function formatPoints(value: number) {
  return `${formatNumber(value)}pt`;
}

function formatTokens(tokens: number) {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return formatNumber(tokens);
}

function getDisplayPoints(admin: AdminData) {
  return admin.credit.remaining >= 1000 ? admin.credit.remaining : admin.credit.remaining * CREDIT_POINT_UNIT;
}

function getCompanyInitials(companyName: string) {
  return companyName.trim().replace(/\s+/g, '').slice(0, 2).toUpperCase();
}

function progressStyle(percent: number): ProgressStyle {
  return { '--progress': `${Math.max(0, Math.min(100, percent))}%` };
}

export function AdminPage({ admin, navigate, showAlert }: AdminPageProps) {
  const remainingPoints = getDisplayPoints(admin);
  const monthlyBudget = Math.max(
    remainingPoints,
    Math.round((remainingPoints / Math.max(admin.credit.percent, 1)) * 100),
  );
  const pointPercent = Math.min(100, Math.round((remainingPoints / Math.max(monthlyBudget, 1)) * 100));
  const tokenUsage = Math.round(remainingPoints * TOKEN_PER_POINT);
  const activeRooms = Math.max(admin.operatingStatus.activeJobs + admin.members.length + 5, 1);
  const guardrailAlerts = admin.operatingStatus.pendingReviews > 0 ? 3 : 1;
  const roomDailyLimit = Math.round(monthlyBudget * 0.1);
  const generationLimit = Math.round(monthlyBudget * 0.025);

  const metrics: AdminMetric[] = [
    {
      label: '남은 포인트',
      value: formatNumber(remainingPoints),
      helper: `월 예산 ${formatPoints(monthlyBudget)} 기준`,
      tone: 'primary',
      icon: <CreditCardOutlined />,
    },
    {
      label: '이번 달 LLM 토큰',
      value: formatTokens(tokenUsage),
      helper: '벤더 사용량 기준 자동 차감',
      tone: 'accent',
      icon: <ApiOutlined />,
    },
    {
      label: '활성 면접방',
      value: String(activeRooms),
      helper: '비밀번호 만료 예정 2개',
      tone: 'warning',
      icon: <AuditOutlined />,
    },
    {
      label: '가드레일 알림',
      value: String(guardrailAlerts),
      helper: '상한 초과 접근 차단',
      tone: 'danger',
      icon: <WarningOutlined />,
    },
  ];

  const guardrailLimits = [
    { label: '프로필 분석', value: formatPoints(Math.round(monthlyBudget * 0.024)), percent: 42 },
    { label: '질문 생성', value: formatPoints(Math.round(monthlyBudget * 0.088)), percent: 74 },
    { label: '재생성 제한', value: '방당 5회', percent: 36 },
  ];

  const interviewRooms = [
    {
      key: 'room-1',
      room: '방1',
      role: '백엔드 개발자',
      purpose: '면접관 전용',
      password: 'K9p-42Qx',
      questions: 84,
      lastGenerated: '최근 12분 전',
      points: Math.round(remainingPoints * 0.1664),
      status: '활성',
      tone: 'accent' as const,
    },
    {
      key: 'room-2',
      room: '방2',
      role: '프로덕트 디자이너',
      purpose: '평가자 공유',
      password: '만료 임박',
      questions: 51,
      lastGenerated: '오늘 10:42',
      points: Math.round(remainingPoints * 0.1043),
      status: '갱신',
      tone: 'warning' as const,
    },
    {
      key: 'room-3',
      room: '방3',
      role: '데이터 분석가',
      purpose: '내부 리뷰',
      password: '비공개',
      questions: 33,
      lastGenerated: '어제 18:20',
      points: Math.round(remainingPoints * 0.0661),
      status: '대기',
      tone: 'primary' as const,
    },
  ];

  const usageLogs = [
    {
      key: 'question',
      icon: <ThunderboltOutlined />,
      title: '방1 질문 12개 생성',
      detail: `gpt-4.1 · ${formatNumber(Math.round(remainingPoints * 0.2456))} tokens`,
      cost: Math.round(remainingPoints * 0.0168),
      time: '12분 전',
    },
    {
      key: 'profile',
      icon: <CloudSyncOutlined />,
      title: '지원자 프로필 요약',
      detail: `gpt-4.1-mini · ${formatNumber(Math.round(remainingPoints * 0.1053))} tokens`,
      cost: Math.round(remainingPoints * 0.0056),
      time: '46분 전',
    },
  ];

  return (
    <div className="admin-page startup-admin-page">
      <PageTitle
        eyebrow="Company Admin"
        title="개별 스타트업 관리자"
        description={`${admin.companyName} HR 담당자의 면접방, 비밀번호, LLM 질문 생성량과 포인트 차감 한도를 관리합니다.`}
        actions={
          <Space wrap>
            <Button
              icon={<SettingOutlined />}
              onClick={() => showAlert({ type: 'info', message: 'LLM 사용 한도 조정 패널을 표시했습니다.' })}
            >
              한도 조정
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showAlert({ type: 'info', message: '면접방 생성 목업을 표시했습니다.' })}
            >
              면접방 생성
            </Button>
          </Space>
        }
      />

      <section className="admin-metric-grid" aria-label="스타트업 관리자 요약">
        {metrics.map((metric) => (
          <article className={`admin-metric-card ${metric.tone}`} key={metric.label}>
            <span className="admin-metric-icon" aria-hidden="true">
              {metric.icon}
            </span>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.helper}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-workspace-grid">
        <div className="admin-main-stack">
          <SectionCard
            title="LLM 질문 생성 가드레일"
            className="admin-guardrail-card"
            extra={
              <Button
                type="link"
                onClick={() => showAlert({ type: 'info', message: '정책 변경 내역을 불러왔습니다.' })}
              >
                정책 변경 내역
              </Button>
            }
          >
            <div className="admin-guardrail-layout">
              <div className="admin-budget-panel">
                <div className="admin-budget-head">
                  <div>
                    <span className="admin-muted-label">회사 월 포인트 예산</span>
                    <strong>{formatPoints(monthlyBudget)}</strong>
                  </div>
                  <Tag color="green" className="admin-large-tag">
                    정상 운영
                  </Tag>
                </div>
                <Progress className="admin-budget-progress" percent={pointPercent} showInfo={false} />
                <div className="admin-policy-grid">
                  <div>
                    <span>질문 생성 1회</span>
                    <strong>{formatPoints(generationLimit)}</strong>
                  </div>
                  <div>
                    <span>방별 일일 한도</span>
                    <strong>{formatPoints(roomDailyLimit)}</strong>
                  </div>
                  <div>
                    <span>포인트 환산</span>
                    <strong>토큰 기반</strong>
                  </div>
                </div>
              </div>

              <aside className="admin-guardrail-side" aria-label="가드레일 세부 제한">
                <div className="admin-token-callout">
                  <strong>토큰 기반 차감</strong>
                  <p>LLM 벤더 사용 토큰을 수집하고 회사 포인트에서 자동 차감합니다.</p>
                </div>
                <div className="admin-limit-list">
                  {guardrailLimits.map((limit) => (
                    <div className="admin-limit-row" key={limit.label}>
                      <div>
                        <strong>{limit.label}</strong>
                        <small>{limit.value}</small>
                      </div>
                      <span className="admin-mini-progress" style={progressStyle(limit.percent)} aria-hidden="true">
                        <span />
                      </span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </SectionCard>

          <SectionCard
            title="면접방 / 비밀번호 관리"
            className="admin-room-card"
            extra={
              <Button
                type="link"
                onClick={() => showAlert({ type: 'info', message: '전체 면접방 목록을 표시했습니다.' })}
              >
                전체 방 보기
              </Button>
            }
          >
            <div className="admin-room-table-wrap">
              <table className="admin-room-table">
                <thead>
                  <tr>
                    <th>면접방</th>
                    <th>용도</th>
                    <th>비밀번호</th>
                    <th>질문 생성</th>
                    <th>포인트</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {interviewRooms.map((room) => (
                    <tr key={room.key}>
                      <td>
                        <strong>{room.room}</strong>
                        <small>{room.role}</small>
                      </td>
                      <td>{room.purpose}</td>
                      <td>
                        <button
                          className={`admin-password-pill ${room.tone}`}
                          type="button"
                          onClick={() => showAlert({ type: 'success', message: `${room.room} 비밀번호를 복사했습니다.` })}
                        >
                          <KeyOutlined />
                          <span>{room.password}</span>
                        </button>
                      </td>
                      <td>
                        <strong>{room.questions}개</strong>
                        <small>{room.lastGenerated}</small>
                      </td>
                      <td>{formatPoints(room.points)}</td>
                      <td>
                        <Tag color={room.tone === 'accent' ? 'green' : room.tone === 'warning' ? 'gold' : 'blue'}>
                          {room.status}
                        </Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <aside className="admin-side-stack">
          <SectionCard
            title="스타트업 프로필"
            className="admin-profile-card"
            extra={<Button type="link" onClick={() => navigate('/company')}>수정</Button>}
          >
            <div className="admin-company-profile">
              <div className="admin-company-head">
                <span className="admin-company-logo" aria-hidden="true">
                  {getCompanyInitials(admin.companyName)}
                </span>
                <div>
                  <strong>{admin.companyName}</strong>
                  <p>채용 운영 워크스페이스 · 진행 중 JD {admin.operatingStatus.activeJobs}건</p>
                </div>
              </div>
              <dl className="admin-profile-list">
                <div>
                  <dt>대표 HR</dt>
                  <dd>{admin.ownerName} / Talent Lead</dd>
                </div>
                <div>
                  <dt>담당자 식별값</dt>
                  <dd>SKN-123123 / 1</dd>
                </div>
                <div>
                  <dt>질문 생성 권한</dt>
                  <dd>HR 관리자 {admin.members.length}명</dd>
                </div>
              </dl>
            </div>
          </SectionCard>

          <SectionCard
            title="비밀번호 정책"
            className="admin-password-policy-card"
            extra={
              <Button
                type="link"
                onClick={() => showAlert({ type: 'info', message: '비밀번호 정책 편집 패널을 표시했습니다.' })}
              >
                정책 편집
              </Button>
            }
          >
            <div className="admin-security-list">
              <div className="admin-security-row">
                <span aria-hidden="true">
                  <CopyOutlined />
                </span>
                <div>
                  <strong>자동 생성 길이</strong>
                  <small>8~12자, 특수문자 포함</small>
                </div>
                <Tag color="green">적용</Tag>
              </div>
              <div className="admin-security-row">
                <span aria-hidden="true">
                  <UserSwitchOutlined />
                </span>
                <div>
                  <strong>만료 주기</strong>
                  <small>면접방 생성 후 7일</small>
                </div>
                <Tag color="blue">7일</Tag>
              </div>
              <div className="admin-security-row">
                <span aria-hidden="true">
                  <SafetyCertificateOutlined />
                </span>
                <div>
                  <strong>방별 접근</strong>
                  <small>면접관 권한 계정만 입장</small>
                </div>
                <Tag color="green">보호</Tag>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="LLM 사용 로그"
            className="admin-usage-card"
            extra={
              <Button
                type="link"
                onClick={() => showAlert({ type: 'info', message: 'LLM 사용 로그 다운로드를 준비했습니다.' })}
              >
                다운로드
              </Button>
            }
          >
            <div className="admin-usage-chart" aria-label="최근 7일 LLM 사용량">
              {[32, 46, 68, 40, 78, 58, 86].map((height, index) => (
                <span
                  className={index === 2 || index === 5 ? 'accent' : undefined}
                  style={progressStyle(height)}
                  key={`${height}-${index}`}
                />
              ))}
            </div>
            <div className="admin-log-list">
              {usageLogs.map((log) => (
                <div className="admin-log-row" key={log.key}>
                  <span className="admin-log-icon" aria-hidden="true">
                    {log.icon}
                  </span>
                  <div>
                    <strong>{log.title}</strong>
                    <small>{log.detail}</small>
                  </div>
                  <div className="admin-log-cost">
                    <strong>-{formatPoints(log.cost)}</strong>
                    <small>{log.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </section>
    </div>
  );
}
