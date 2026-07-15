import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanyCompletionPanel } from './CompanyCompletionPanel';
import type { CompanyProfile } from '../../api/adapters';

const company: CompanyProfile = {
  name: '휴머',
  employeeCount: 42,
  teamComposition: ['제품팀'],
  description: '채용 분석 서비스',
  employStyle: ['꼼꼼한 사람'],
  completion: 80,
};

describe('CompanyCompletionPanel', () => {
  it('저장과 중복되는 수정 완료 버튼을 노출하지 않는다', () => {
    render(<CompanyCompletionPanel company={company} />);

    expect(screen.queryByRole('button', { name: /수정 완료/ })).not.toBeInTheDocument();
  });
});
