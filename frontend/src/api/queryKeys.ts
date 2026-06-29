export const queryKeys = {
  appData: (authMode?: string, apiKeyFingerprint?: string) =>
    authMode ? (['app-data', authMode, apiKeyFingerprint ?? 'default'] as const) : (['app-data'] as const),
  company: () => ['company'] as const,
  checklist: (jobDescriptionId: string | number) => ['checklist', String(jobDescriptionId)] as const,
  dashboard: () => ['dashboard'] as const,
  jobDescriptions: () => ['job-descriptions'] as const,
  jobDescription: (id: string | number) => ['job-descriptions', String(id)] as const,
  userProfile: () => ['user-profile'] as const,
};
