export const queryKeys = {
  appData: (authMode?: string, authSessionKey?: string) =>
    authMode ? (['app-data', authMode, authSessionKey ?? 'default'] as const) : (['app-data'] as const),
  company: () => ['company'] as const,
  checklist: (jobDescriptionId: string | number, authSessionKey?: string) =>
    authSessionKey
      ? (['checklist', String(jobDescriptionId), authSessionKey] as const)
      : (['checklist', String(jobDescriptionId)] as const),
  dashboard: () => ['dashboard'] as const,
  jobDescriptions: () => ['job-descriptions'] as const,
  jobDescription: (id: string | number) => ['job-descriptions', String(id)] as const,
  userProfile: () => ['user-profile'] as const,
};
