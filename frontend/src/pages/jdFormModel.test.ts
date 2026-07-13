import { describe, expect, it } from 'vitest';
import type { JdItem } from '../api/adapters';
import { normalizeJdEditorValues, toJdEditorValues } from '../models/jdFormModel';

describe('jdFormModel', () => {
  it('maps an unsupported status to prepare without changing field meanings', () => {
    const item = {
      title: 'Frontend',
      educationLevel: '학사',
      major: '컴퓨터공학',
      requiredExperience: '3년',
      stack: ['React'],
      preferredStack: ['TypeScript'],
      summary: '개발',
      hiringReason: '증원',
      employmentType: '정규직',
      statusCode: 'legacy',
    } as unknown as JdItem;

    expect(toJdEditorValues(item)).toMatchObject({ job_name: 'Frontend', status: 'prepare' });
  });

  it('trims required and preferred skill lists for the API payload', () => {
    expect(normalizeJdEditorValues({
      job_name: 'Frontend', education_level: '', major: '', career_level: '3년',
      required_skill: [' React ', ''], preferred_skill: [' TypeScript '], main_task: '',
      hiring_reason: '', work_type: '', status: 'prepare',
    })).toMatchObject({ required_skill: ['React'], preferred_skill: ['TypeScript'] });
  });
});
