import type { ReactNode } from 'react';

type PageTitleProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageTitle({ eyebrow, title, description, actions }: PageTitleProps) {
  return (
    <div className="page-title">
      <div className="page-title-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
