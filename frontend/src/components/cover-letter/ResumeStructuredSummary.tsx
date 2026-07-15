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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compactParts(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(' · ');
}

function formatRange(start: unknown, end: unknown) {
  return [toDisplayText(start), toDisplayText(end)].map((part) => part.trim()).filter(Boolean).join('~');
}

const DEGREE_LABEL: Record<string, string> = {
  bachelor: '학사',
  master: '석사',
  doctoral: '박사',
};

function toEducationItems(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    return toReadableList(value);
  }

  if (isRecord(value)) {
    const record = value;
    const summary = toDisplayText(record.summary).trim();
    const degree = toDisplayText(record.final_degree).trim();
    const items = [
      degree ? `최종 학위: ${DEGREE_LABEL[degree] ?? degree}` : '',
      toDisplayText(record.bachelor).trim() ? `학사: ${toDisplayText(record.bachelor).trim()}` : '',
      toDisplayText(record.master).trim() ? `석사: ${toDisplayText(record.master).trim()}` : '',
      toDisplayText(record.doctoral).trim() ? `박사: ${toDisplayText(record.doctoral).trim()}` : '',
      summary ? `기존 요약: ${summary}` : '',
    ].filter(Boolean);

    if (items.length) {
      return items;
    }

    return Object.entries(record)
      .map(([key, nextValue]) => `${key}: ${toDisplayText(nextValue)}`)
      .filter((item) => item.trim() !== `${item.split(':')[0]}:`);
  }

  return toReadableList(value);
}

function toExperienceItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return toReadableList(item);
    }

    const heading = compactParts([
      toDisplayText(item.company_name),
      toDisplayText(item.length),
      toDisplayText(item.position),
    ]);
    const description = toDisplayText(item.experience_description).trim();

    return [heading, description].filter(Boolean);
  });
}

function toIntroductionItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value
    .flatMap((item) => {
      if (!isRecord(item)) {
        return toReadableList(item);
      }

      const question = toDisplayText(item.question).trim();
      const answer = toDisplayText(item.answer).trim();

      return [question ? `문항: ${question}` : '', answer ? `답변: ${answer}` : ''].filter(Boolean);
    })
    .filter(Boolean);
}

function toLanguageItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return toReadableList(item);
    }

    return compactParts([
      toDisplayText(item.language_name),
      toDisplayText(item.test_name),
      toDisplayText(item.score),
    ]);
  }).filter(Boolean);
}

function toAwardItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return toReadableList(item);
    }

    return compactParts([
      toDisplayText(item.award_name),
      toDisplayText(item.award_from),
      toDisplayText(item.time),
    ]);
  }).filter(Boolean);
}

function toTrainingItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return toReadableList(item);
    }

    const heading = compactParts([
      toDisplayText(item.education_name),
      toDisplayText(item.education_from),
      formatRange(item.start, item.end),
    ]);
    const description = toDisplayText(item.education_description).trim();

    return [heading, description].filter(Boolean);
  });
}

function toOtherActivityItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return toReadableList(value);
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return toReadableList(item);
    }

    const heading = compactParts([toDisplayText(item.activity_name), formatRange(item.start, item.end)]);
    const description = toDisplayText(item.activity_description).trim();

    return [heading, description].filter(Boolean);
  });
}

const summaryGroups = [
  { key: 'education_level', label: '학력', getItems: (resume: Resume) => toEducationItems(resume.education_level) },
  { key: 'experience', label: '경력', getItems: (resume: Resume) => toExperienceItems(resume.experience) },
  {
    key: 'self_intoduction',
    label: '자기소개 문항',
    getItems: (resume: Resume) => toIntroductionItems(resume.self_intoduction),
  },
  { key: 'certification', label: '자격/인증', getItems: (resume: Resume) => toReadableList(resume.certification) },
  { key: 'language', label: '언어', getItems: (resume: Resume) => toLanguageItems(resume.language) },
  { key: 'award', label: '수상', getItems: (resume: Resume) => toAwardItems(resume.award) },
  { key: 'training', label: '교육/훈련', getItems: (resume: Resume) => toTrainingItems(resume.training) },
  { key: 'other_activity', label: '기타 활동', getItems: (resume: Resume) => toOtherActivityItems(resume.other_activity) },
] as const;

export function ResumeStructuredSummary({ resume }: ResumeStructuredSummaryProps) {
  if (!resume) {
    return null;
  }

  const skills = toTrimmedStringList(resume.skill);

  return (
    <section className="resume-structured-summary">
      <div className="resume-structured-summary-head">
        <h3>자기소개서 요약</h3>
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
