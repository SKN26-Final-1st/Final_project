import type { NavigationProps } from './navigationTypes';
import { sidebarMenu } from './navigationUtils';

type MenuItemsProps = Pick<NavigationProps, 'allowedRoutes' | 'route' | 'navigate'> & {
  onNavigate?: () => void;
};

export function MenuItems({ allowedRoutes, route, navigate, onNavigate }: MenuItemsProps) {
  const items = allowedRoutes?.length
    ? sidebarMenu.filter((item) => allowedRoutes.includes(item.route))
    : sidebarMenu;

  return (
    <>
      {items.map((item) => {
        const isActive = route === item.route;
        return (
          <button
            key={item.route}
            type="button"
            className={`side-nav-item ${isActive ? 'active' : ''}`}
            aria-label={`${item.label}: ${item.description}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => {
              onNavigate?.();
              event.currentTarget.blur();
              navigate(item.route);
            }}
          >
            <span className="side-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        );
      })}
    </>
  );
}
