import type { ReactNode } from 'react';
import {
  BankOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FormOutlined,
  IdcardOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';

export type AppRoute =
  | '/dashboard'
  | '/admin'
  | '/company'
  | '/jd'
  | '/cover-letter'
  | '/chat'
  | '/mypage'
  | '/recruitment-post'
  | '/cover-letter-template'
  | '/login'
  | '/signup'
  | '/password-reset';

export type MenuItem = {
  route: AppRoute;
  label: string;
  description: string;
  icon: ReactNode;
};

export type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

export const palette = {
  primary: '#2563EB',
  accent: '#14B8A6',
  dark: '#1E3A8A',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
};

export const mainMenu: MenuItem[] = [
  {
    route: '/dashboard',
    label: '대시보드',
    description: '채용/지원자/분석 현황 요약',
    icon: <DashboardOutlined />,
  },
  {
    route: '/admin',
    label: '관리자',
    description: 'HR 담당자와 운영 권한 관리',
    icon: <SafetyCertificateOutlined />,
  },
  {
    route: '/company',
    label: '회사 정보',
    description: '회사 프로필과 분석 기준',
    icon: <BankOutlined />,
  },
  {
    route: '/jd',
    label: 'JD 관리',
    description: '직무기술서 작성/분석 요청',
    icon: <ProfileOutlined />,
  },
  {
    route: '/cover-letter',
    label: '자기소개서',
    description: '단건 입력과 Excel 업로드',
    icon: <FileTextOutlined />,
  },
  {
    route: '/mypage',
    label: '마이페이지',
    description: '프로필/보안/회사 요약',
    icon: <UserOutlined />,
  },
  {
    route: '/recruitment-post',
    label: '모집 공고',
    description: '복수 JD 기반 공고 미리보기',
    icon: <FileDoneOutlined />,
  },
  {
    route: '/cover-letter-template',
    label: '자소서 포맷',
    description: 'JD 기반 문항/가이드 생성',
    icon: <FormOutlined />,
  },
];

export const authMenu: MenuItem[] = [
  {
    route: '/login',
    label: '로그인',
    description: '목업 인증 화면',
    icon: <IdcardOutlined />,
  },
  {
    route: '/signup',
    label: '회원가입',
    description: 'ID 중복 확인과 프로필 업로드',
    icon: <UserOutlined />,
  },
  {
    route: '/password-reset',
    label: '비밀번호 찾기',
    description: '단계형 재설정',
    icon: <FileTextOutlined />,
  },
];
