import { describe, expect, it } from 'vitest';
import {
  toCoverLetterPayload,
  toEmptyCoverLetterValues,
  type CoverLetterInputFormValues,
} from '../models/coverLetterFormModel';

describe('coverLetterFormModel', () => {
  it('keeps the selected JD and a default self-introduction row for a new resume', () => {
    expect(toEmptyCoverLetterValues('12')).toMatchObject({
      job_description_id: 12,
      self_intoduction: [{ question: '', answer: '' }],
    });
  });

  it('preserves list-of-object payloads while trimming and dropping empty rows', () => {
    const values: CoverLetterInputFormValues = {
      ...toEmptyCoverLetterValues('12'),
      name: '지원자',
      skill: [' React ', ''],
      experience: [
        { company_name: ' 회사 ', length: ' 2년 ', position: '', experience_description: ' 개발 ' },
        { company_name: '', length: '', position: '', experience_description: '' },
      ],
      self_intoduction: [{ question: ' 질문 ', answer: ' 답변 ' }],
    };

    expect(toCoverLetterPayload(values, values)).toMatchObject({
      skill: ['React'],
      experience: [{ company_name: '회사', length: '2년', position: '', experience_description: '개발' }],
      self_intoduction: [{ question: '질문', answer: '답변' }],
    });
  });
});
