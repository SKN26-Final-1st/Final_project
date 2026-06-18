import { Button, Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompanyProfileForm, type CompanyProfileFormValues } from './CompanyProfileForm';

const initialValues: CompanyProfileFormValues = {
  company_name: '휴머',
  employee_count: 42,
  team_composition: ['플랫폼팀'],
  company_description: '채용 분석 서비스',
  employ_style: ['꼼꼼한 사람'],
};

function CompanyProfileFormHarness({ onRead }: { onRead: (values: CompanyProfileFormValues) => void }) {
  const [form] = Form.useForm<CompanyProfileFormValues>();

  return (
    <>
      <CompanyProfileForm form={form} initialValues={initialValues} />
      <Button onClick={() => onRead(form.getFieldsValue())}>값 확인</Button>
    </>
  );
}

describe('CompanyProfileForm', () => {
  it('기존 팀 구성과 선호 인재상 항목을 입력 필드에서 직접 수정한다', async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();

    render(<CompanyProfileFormHarness onRead={onRead} />);

    const teamInput = screen.getByDisplayValue('플랫폼팀');
    const employStyleInput = screen.getByDisplayValue('꼼꼼한 사람');

    await user.clear(teamInput);
    await user.type(teamInput, '제품팀');
    await user.clear(employStyleInput);
    await user.type(employStyleInput, '협업을 잘하는 사람');
    await user.click(screen.getByRole('button', { name: '값 확인' }));

    expect(onRead).toHaveBeenCalledWith(
      expect.objectContaining({
        team_composition: ['제품팀'],
        employ_style: ['협업을 잘하는 사람'],
      }),
    );
  });

  it('리스트 항목 추가 버튼을 노출한다', () => {
    render(<CompanyProfileFormHarness onRead={vi.fn()} />);

    expect(screen.getByRole('button', { name: /팀 추가/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /인재상 추가/ })).toBeInTheDocument();
  });
});
