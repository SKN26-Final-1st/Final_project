export const queryKeys = {
  appData: () => ['app-data'] as const,
  authDefaults: () => ['auth', 'defaults'] as const,
  company: () => ['company'] as const,
  dashboard: () => ['dashboard'] as const,
  jobDescriptions: () => ['job-descriptions'] as const,
  jobDescription: (id: string | number) => ['job-descriptions', String(id)] as const,
  userProfile: () => ['user-profile'] as const,
};
