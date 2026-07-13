import type { JdItem } from '../api/adapters';
import { toTrimmedStringList } from '../utils/stringList';

export type JdEditorFormValues = {
  job_name: string;
  education_level: string;
  major: string;
  career_level: string;
  required_skill: string[];
  preferred_skill: string[];
  main_task: string;
  hiring_reason: string;
  work_type: string;
  status: 'prepare' | 'on_going' | 'closed';
};

export const EMPTY_JD_EDITOR_VALUES: JdEditorFormValues = {
  job_name: '', education_level: '', major: '', career_level: '', required_skill: [], preferred_skill: [],
  main_task: '', hiring_reason: '', work_type: '', status: 'prepare',
};

export function toJdEditorValues(selectedJd: JdItem): JdEditorFormValues {
  const validStatus = ['prepare', 'on_going', 'closed'].includes(selectedJd.statusCode)
    ? (selectedJd.statusCode as JdEditorFormValues['status'])
    : 'prepare';
  return {
    job_name: selectedJd.title,
    education_level: selectedJd.educationLevel,
    major: selectedJd.major,
    career_level: selectedJd.requiredExperience,
    required_skill: selectedJd.stack,
    preferred_skill: selectedJd.preferredStack,
    main_task: selectedJd.summary,
    hiring_reason: selectedJd.hiringReason,
    work_type: selectedJd.employmentType,
    status: validStatus,
  };
}

export function normalizeJdEditorValues(values: JdEditorFormValues): JdEditorFormValues {
  return {
    ...values,
    required_skill: toTrimmedStringList(values.required_skill),
    preferred_skill: toTrimmedStringList(values.preferred_skill),
  };
}
