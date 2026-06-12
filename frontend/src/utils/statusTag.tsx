import { Tag } from 'antd';
import type { StatusCode } from '../data/apiMockData';

const statusColorByCode: Partial<Record<StatusCode, string>> = {
  reviewed: 'green',
  subscribe_active: 'green',
  grade_a: 'green',
  grade_b: 'blue',
  done: 'green',
  normal: 'green',
  processing: 'blue',
  on_going: 'blue',
  prepare: 'default',
  onqueue: 'gold',
  needs_review: 'gold',
  grade_c: 'gold',
  grade_d: 'orange',
  grade_f: 'red',
  closed: 'default',
  subscribe_expired: 'default',
};

export function statusTag(label: string, statusCode?: StatusCode) {
  return <Tag color={statusCode ? statusColorByCode[statusCode] : 'default'}>{label}</Tag>;
}
