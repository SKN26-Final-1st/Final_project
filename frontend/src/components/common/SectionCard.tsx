import type { ReactNode } from 'react';
import { Card } from 'antd';

type SectionCardProps = {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  extra?: ReactNode;
};

export function SectionCard({ children, className, title, extra }: SectionCardProps) {
  const cardClassName = ['section-card', className].filter(Boolean).join(' ');

  return (
    <Card className={cardClassName} title={title} extra={extra}>
      {children}
    </Card>
  );
}
