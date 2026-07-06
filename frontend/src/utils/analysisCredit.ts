import type { UserProfile } from '../api/adapters';

export const ANALYSIS_CREDIT_COST = 100;

export function getAnalysisCreditCost(profile: UserProfile | null | undefined, isApiKeyMode: boolean) {
  if (!isApiKeyMode && profile?.subscribe) {
    return 0;
  }

  return ANALYSIS_CREDIT_COST;
}

export function hasEnoughAnalysisCredit(profile: UserProfile | null | undefined, cost: number) {
  return cost <= 0 || (profile?.credit ?? 0) >= cost;
}

export function getAnalysisCreditText(cost: number, isApiKeyMode: boolean) {
  if (cost <= 0) {
    return '분석 비용 0p';
  }

  return isApiKeyMode ? `API Key 분석 비용 -${cost}p` : `분석 비용 -${cost}p`;
}
