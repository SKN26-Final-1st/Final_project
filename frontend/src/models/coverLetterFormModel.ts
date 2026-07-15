import type { Resume } from '../data/backendTypes';
import { toTrimmedStringList } from '../utils/stringList';

export type EducationDegree = 'bachelor' | 'master' | 'doctoral' | '';
export type EducationLevelFormValue = {
  final_degree: EducationDegree;
  bachelor: string;
  master: string;
  doctoral: string;
  summary?: string;
};
export type ExperienceFormValue = { company_name: string; length: string; position: string; experience_description: string };
export type SelfIntroductionFormValue = { question: string; answer: string };
export type LanguageFormValue = { language_name: string; test_name: string; score: string };
export type AwardFormValue = { award_name: string; award_from: string; time: string };
export type TrainingFormValue = {
  education_name: string;
  education_from: string;
  education_description: string;
  start: string;
  end: string;
};
export type OtherActivityFormValue = { activity_name: string; activity_description: string; start: string; end: string };

export type CoverLetterInputFormValues = {
  job_description_id?: number;
  name: string;
  skill: string[];
  education_level: EducationLevelFormValue;
  experience: ExperienceFormValue[];
  self_intoduction: SelfIntroductionFormValue[];
  certification: string[];
  language: LanguageFormValue[];
  award: AwardFormValue[];
  training: TrainingFormValue[];
  other_activity: OtherActivityFormValue[];
};

const VALID_DEGREES = new Set<EducationDegree>(['', 'bachelor', 'master', 'doctoral']);
const EMPTY_EDUCATION_LEVEL: EducationLevelFormValue = { final_degree: '', bachelor: '', master: '', doctoral: '' };
const EXPERIENCE_KEYS = ['company_name', 'length', 'position', 'experience_description'] as const;
const SELF_INTRODUCTION_KEYS = ['question', 'answer'] as const;
const LANGUAGE_KEYS = ['language_name', 'test_name', 'score'] as const;
const AWARD_KEYS = ['award_name', 'award_from', 'time'] as const;
const TRAINING_KEYS = ['education_name', 'education_from', 'education_description', 'start', 'end'] as const;
const OTHER_ACTIVITY_KEYS = ['activity_name', 'activity_description', 'start', 'end'] as const;

function toStringArray(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function toCleanString(value: unknown) {
  return String(value ?? '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasAnyRecordValue(value: Record<string, string>) {
  return Object.values(value).some((item) => item.trim());
}

function normalizeDegree(value: unknown): EducationDegree {
  const degree = toCleanString(value) as EducationDegree;
  return VALID_DEGREES.has(degree) ? degree : '';
}

function normalizeRecord<T extends Record<string, string>>(
  value: unknown,
  keys: readonly (keyof T & string)[],
): T {
  const record = isRecord(value) ? value : {};
  return keys.reduce((result, key) => {
    result[key] = toCleanString(record[key]) as T[keyof T & string];
    return result;
  }, {} as T);
}

function normalizeEducationLevel(value: Record<string, unknown> | undefined): EducationLevelFormValue {
  const record = isRecord(value) ? value : {};
  const normalized: EducationLevelFormValue = {
    final_degree: normalizeDegree(record.final_degree),
    bachelor: toCleanString(record.bachelor),
    master: toCleanString(record.master),
    doctoral: toCleanString(record.doctoral),
  };
  const summary = toCleanString(record.summary);
  return summary ? { ...normalized, summary } : normalized;
}

function normalizeObjectList<T extends Record<string, string>>(
  value: unknown[] | undefined,
  keys: readonly (keyof T & string)[],
  legacyFactory: (text: string) => T,
): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (isRecord(item) ? normalizeRecord<T>(item, keys) : legacyFactory(toCleanString(item))))
    .filter(hasAnyRecordValue);
}

function normalizeSelfIntroductions(value: unknown[] | undefined): SelfIntroductionFormValue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (isRecord(item)) return normalizeRecord<SelfIntroductionFormValue>(item, SELF_INTRODUCTION_KEYS);
      const text = toCleanString(item);
      const [question = '', ...answerParts] = text.split(/\n\s*\n/);
      return { question: question.trim(), answer: answerParts.join('\n\n').trim() };
    })
    .filter(hasAnyRecordValue);
}

function cleanObjectList<T extends Record<string, string>>(
  value: T[] | undefined,
  keys: readonly (keyof T & string)[],
): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeRecord<T>(item, keys)).filter(hasAnyRecordValue);
}

function cleanEducationLevel(value: EducationLevelFormValue | undefined): EducationLevelFormValue {
  const normalized = normalizeEducationLevel(value as Record<string, unknown> | undefined);
  const summary = toCleanString(normalized.summary);
  return summary ? { ...normalized, summary } : normalized;
}

export function toCoverLetterInitialValues(
  selectedJdId: string | null,
  currentResume: Resume | null,
): CoverLetterInputFormValues {
  const selfIntroductions = normalizeSelfIntroductions(currentResume?.self_intoduction);

  return {
    job_description_id: currentResume?.job_description_id ?? (selectedJdId ? Number(selectedJdId) : undefined),
    name: currentResume?.name ?? '',
    skill: toStringArray(currentResume?.skill),
    education_level: normalizeEducationLevel(currentResume?.education_level),
    experience: normalizeObjectList<ExperienceFormValue>(currentResume?.experience, EXPERIENCE_KEYS, (text) => ({
      company_name: '', length: '', position: '', experience_description: text,
    })),
    self_intoduction: selfIntroductions.length ? selfIntroductions : [{ question: '', answer: '' }],
    certification: toStringArray(currentResume?.certification),
    language: normalizeObjectList<LanguageFormValue>(currentResume?.language, LANGUAGE_KEYS, (text) => ({
      language_name: text, test_name: '', score: '',
    })),
    award: normalizeObjectList<AwardFormValue>(currentResume?.award, AWARD_KEYS, (text) => ({
      award_name: text, award_from: '', time: '',
    })),
    training: normalizeObjectList<TrainingFormValue>(currentResume?.training, TRAINING_KEYS, (text) => ({
      education_name: text, education_from: '', education_description: '', start: '', end: '',
    })),
    other_activity: normalizeObjectList<OtherActivityFormValue>(currentResume?.other_activity, OTHER_ACTIVITY_KEYS, (text) => ({
      activity_name: text, activity_description: '', start: '', end: '',
    })),
  };
}

export function toEmptyCoverLetterValues(selectedJdId: string | null): CoverLetterInputFormValues {
  return {
    job_description_id: selectedJdId ? Number(selectedJdId) : undefined,
    name: '',
    skill: [],
    education_level: { ...EMPTY_EDUCATION_LEVEL },
    experience: [],
    self_intoduction: [{ question: '', answer: '' }],
    certification: [],
    language: [],
    award: [],
    training: [],
    other_activity: [],
  };
}

export function toCoverLetterPayload(
  values: CoverLetterInputFormValues,
  allValues: CoverLetterInputFormValues,
) {
  return {
    name: values.name,
    skill: toTrimmedStringList(allValues.skill ?? values.skill ?? []),
    education_level: cleanEducationLevel(allValues.education_level ?? values.education_level),
    experience: cleanObjectList<ExperienceFormValue>(allValues.experience ?? values.experience, EXPERIENCE_KEYS),
    self_intoduction: cleanObjectList<SelfIntroductionFormValue>(
      allValues.self_intoduction ?? values.self_intoduction,
      SELF_INTRODUCTION_KEYS,
    ),
    certification: toTrimmedStringList(allValues.certification ?? values.certification ?? []),
    language: cleanObjectList<LanguageFormValue>(allValues.language ?? values.language, LANGUAGE_KEYS),
    award: cleanObjectList<AwardFormValue>(allValues.award ?? values.award, AWARD_KEYS),
    training: cleanObjectList<TrainingFormValue>(allValues.training ?? values.training, TRAINING_KEYS),
    other_activity: cleanObjectList<OtherActivityFormValue>(
      allValues.other_activity ?? values.other_activity,
      OTHER_ACTIVITY_KEYS,
    ),
  };
}
