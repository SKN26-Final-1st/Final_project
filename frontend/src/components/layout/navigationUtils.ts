import { activeMainMenu } from '../../data/appConfig';

export const sidebarMenu = activeMainMenu.filter((item) => item.route !== '/mypage');

export function getInitials(name?: string) {
  if (!name) {
    return 'HR';
  }

  return name.trim().slice(0, 2).toUpperCase();
}
