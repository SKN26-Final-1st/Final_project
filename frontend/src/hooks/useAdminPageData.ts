import { useAppDataQuery } from './useAppDataQuery';

export function useAdminPageData() {
  const { data } = useAppDataQuery();

  return {
    admin: data?.admin,
    authKeys: data?.authKeys ?? [],
    jdList: data?.jdList ?? [],
    resumes: data?.resumes ?? [],
  };
}
