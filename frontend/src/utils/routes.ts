import { authMenu, mainMenu, type AppRoute } from '../data/mockData';

const standaloneRoutes: AppRoute[] = ['/chat'];

export const appRoutes = [...mainMenu, ...authMenu].map((item) => item.route).concat(standaloneRoutes);

export const authRoutes: AppRoute[] = ['/login', '/signup', '/password-reset'];

export function isAppRoute(pathname: string): pathname is AppRoute {
  return appRoutes.includes(pathname as AppRoute);
}

export function getRouteFromPathname(pathname: string): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/g, '') || '/dashboard';
  return isAppRoute(normalizedPath) ? normalizedPath : '/dashboard';
}
