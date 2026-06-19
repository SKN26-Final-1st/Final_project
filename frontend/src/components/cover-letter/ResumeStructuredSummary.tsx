import { Tag } from 'antd';
import { CompactTextList } from '../common/CompactTextList';
import type { Resume } from '../../data/backendTypes';
import { toTrimmedStringList } from '../../utils/stringList';

type ResumeStructuredSummaryProps = {
  resume: Resume | null;
};

function toDisplayText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function toReadableList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toDisplayText).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const text = toDisplayText(value).trim();
  return text ? [text] : [];
}

function toEducationItems(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return toReadableList(value);
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const summary = toDisplayText(record.summary).trim();

    if (summary) {
      return [summary];
    }

    return Object.entries(record)
      .map(([key, nextValue]) => `${key}: ${toDisplayText(nextValue)}`)
      .filter((item) => item.trim() !== `${item.split(':')[0]}:`);
  }

  return toReadableList(value);
}

function toIntroductionItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return toReadableList(item);
      }

      const record = item as Record<string, unknown>;
      const question = toDisplayText(record.question).trim();
      const answer = toDisplayText(record.answer).trim();

      return [question ? `문항: ${question}` : '', answer ? `답변: ${answer}` : ''].filter(Boolean);
    })
    .filter(Boolean);
}

const summaryGroups = [
  { key: 'education_level', label: '학력', getItems: (resume: Resume) => toEducationItems(resume.education_level) },
  { key: 'experience', label: '경력', getItems: (resume: Resume) => toReadableList(resume.experience) },
  {
    key: 'self_intoduction',
    label: '자기소개 문항',
    getItems: (resume: Resume) => toIntroductionItems(resume.self_intoduction),
  },
  { key: 'certification', label: '자격/인증', getItems: (resume: Resume) => toReadableList(resume.certification) },
  { key: 'language', label: '언어', getItems: (resume: Resume) => toReadableList(resume.language) },
  { key: 'award', label: '수상', getItems: (resume: Resume) => toReadableList(resume.award) },
  { key: 'training', label: '교육/훈련', getItems: (resume: Resume) => toReadableList(resume.training) },
  { key: 'other_activity', label: '기타 활동', getItems: (resume: Resume) => toReadableList(resume.other_activity) },
] as const;

export function ResumeStructuredSummary({ resume }: ResumeStructuredSummaryProps) {
  if (!resume) {
    return null;
  }

  const skills = toTrimmedStringList(resume.skill);

  return (
    <section className="resume-structured-summary">
      <div className="resume-structured-summary-head">
        <h3>구조화 이력 요약</h3>
        <span className="muted">저장된 JSON 필드를 읽기 쉽게 정리했습니다.</span>
      </div>
      <div className="resume-structured-skills">
        <span>기술 스택</span>
        <div>
          {skills.length ? skills.map((skill, index) => <Tag key={`${skill}-${index}`}>{skill}</Tag>) : <span className="muted">기술 스택이 없습니다.</span>}
        </div>
      </div>
      <div className="resume-structured-summary-grid">
        {summaryGroups.map((group) => (
          <div className="resume-structured-summary-section" key={group.key}>
            <strong>{group.label}</strong>
            <CompactTextList items={group.getItems(resume)} emptyText={`${group.label} 정보가 없습니다.`} summaryLimit={2} />
          </div>
        ))}
      </div>
    </section>
  );
}
