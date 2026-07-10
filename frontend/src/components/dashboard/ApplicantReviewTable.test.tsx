import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ApplicantRow } from '../../api/adapters';
import { ApplicantReviewTable } from './ApplicantReviewTable';

const applicants: ApplicantRow[] = [
  {
    key: 'resume-1',
    name: '홍길동',
    role: '프론트엔드 개발자',
    fit: 88,
    stage: '분석 완료',
    status: '검토 필요',
    statusCode: 'needs_review',
  },
];

describe('ApplicantReviewTable', () => {
  it('지원자 목록은 유지하고 동작하지 않는 자세히 액션은 노출하지 않는다', () => {
    render(<ApplicantReviewTable applicants={applicants} />);

    expect(screen.getByText('지원자 검토 목록')).toBeInTheDocument();
    expect(screen.getAllByText('홍길동')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '자세히' })).not.toBeInTheDocument();
    expect(screen.queryByText('지원자 상세 목록 화면은 API 연동 단계에서 연결합니다.')).not.toBeInTheDocument();

    const mobileList = screen.getByLabelText('Applicant review list');
    expect(within(mobileList).getByText('프론트엔드 개발자')).toBeInTheDocument();
    expect(within(mobileList).getByText('분석 완료')).toBeInTheDocument();
  });
});
