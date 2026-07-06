import type { Account, CompanyInfo } from '../../data/backendTypes';

export type CompanyProfile = {
  name: string;
  employeeCount: number;
  teamComposition: string[];
  description: string;
  employStyle: string[];
  completion: number;
};

export type UserProfile = {
  displayName: string;
  username: string;
  avatarUrl?: string;
  roleName: string;
  companyName: string;
  credit: number;
  subscribe: boolean;
  subscribeExpirationIso: string;
  subscribeExpirationText: string;
  verificationQuestion: string;
};

function toDisplayText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toDisplayText).filter(Boolean);
}

function formatDateTime(isoDate: string) {
  if (!isoDate) {
    return '미설정';
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function mapCompany(data: CompanyInfo): CompanyProfile {
  const teamComposition = toStringList(data.team_composition);
  const employStyle = toStringList(data.employ_style);
  const completedFields = [
    Boolean(data.company_name),
    data.employee_count > 0,
    teamComposition.length > 0,
    Boolean(data.company_description),
    employStyle.length > 0,
  ].filter(Boolean).length;

  return {
    name: data.company_name,
    employeeCount: data.employee_count,
    teamComposition,
    description: data.company_description,
    employStyle,
    completion: Math.round((completedFields / 5) * 100),
  };
}

export function mapUserProfile(data: Account, company?: CompanyInfo): UserProfile {
  return {
    displayName: data.name,
    username: data.username,
    roleName: data.subscribe ? '구독 활성' : '구독 만료',
    companyName: company?.company_name ?? '회사 정보 없음',
    credit: data.credit,
    subscribe: data.subscribe,
    subscribeExpirationIso: data.subscribe_expiration,
    subscribeExpirationText: formatDateTime(data.subscribe_expiration),
    verificationQuestion: data.verification_question,
  };
}
