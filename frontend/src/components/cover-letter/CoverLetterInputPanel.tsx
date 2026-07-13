import { Collapse, Form, Input, Select, Tag, type FormInstance } from 'antd';
import type { JdItem } from '../../api/adapters';
import type {
  AwardFormValue,
  CoverLetterInputFormValues,
  ExperienceFormValue,
  LanguageFormValue,
  OtherActivityFormValue,
  SelfIntroductionFormValue,
  TrainingFormValue,
} from '../../models/coverLetterFormModel';
import { CollapsibleEditableStringListField } from '../common/CollapsibleEditableStringListField';
import { StructuredResumeListField } from './StructuredResumeListField';

export type {
  AwardFormValue,
  CoverLetterInputFormValues,
  EducationDegree,
  EducationLevelFormValue,
  ExperienceFormValue,
  LanguageFormValue,
  OtherActivityFormValue,
  SelfIntroductionFormValue,
  TrainingFormValue,
} from '../../models/coverLetterFormModel';

type CoverLetterInputPanelProps = {
  jdList: JdItem[];
  form: FormInstance<CoverLetterInputFormValues>;
  initialValues: CoverLetterInputFormValues;
  mode: 'create' | 'edit';
  setSelectedJdId: (id: string) => void;
};

const DEGREE_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: 'bachelor', label: '학사' },
  { value: 'master', label: '석사' },
  { value: 'doctoral', label: '박사' },
];

const EMPTY_EXPERIENCE: ExperienceFormValue = {
  company_name: '',
  length: '',
  position: '',
  experience_description: '',
};

const EMPTY_SELF_INTRODUCTION: SelfIntroductionFormValue = {
  question: '',
  answer: '',
};

const EMPTY_LANGUAGE: LanguageFormValue = {
  language_name: '',
  test_name: '',
  score: '',
};

const EMPTY_AWARD: AwardFormValue = {
  award_name: '',
  award_from: '',
  time: '',
};

const EMPTY_TRAINING: TrainingFormValue = {
  education_name: '',
  education_from: '',
  education_description: '',
  start: '',
  end: '',
};

const EMPTY_OTHER_ACTIVITY: OtherActivityFormValue = {
  activity_name: '',
  activity_description: '',
  start: '',
  end: '',
};

function compactParts(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(' · ');
}

function formatRange(start: string, end: string) {
  const range = [start, end].map((part) => part.trim()).filter(Boolean).join('~');
  return range;
}

function experienceSummary(item: ExperienceFormValue) {
  return compactParts([item.company_name, item.length, item.position]) || item.experience_description;
}

function selfIntroductionSummary(item: SelfIntroductionFormValue) {
  return item.question || item.answer;
}

function languageSummary(item: LanguageFormValue) {
  return compactParts([item.language_name, item.test_name, item.score]);
}

function awardSummary(item: AwardFormValue) {
  return compactParts([item.award_name, item.award_from, item.time]);
}

function trainingSummary(item: TrainingFormValue) {
  return compactParts([item.education_name, item.education_from, formatRange(item.start, item.end)]);
}

function otherActivitySummary(item: OtherActivityFormValue) {
  return compactParts([item.activity_name, formatRange(item.start, item.end)]);
}

export function CoverLetterInputPanel({
  jdList,
  form,
  initialValues,
  mode,
  setSelectedJdId,
}: CoverLetterInputPanelProps) {
  const isCreateMode = mode === 'create';

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <div className="jd-editor-mode-row">
        <Tag color={isCreateMode ? 'processing' : 'blue'}>{isCreateMode ? '신규 작성' : '수정 모드'}</Tag>
        <span>
          {isCreateMode
            ? '필수 항목을 입력해 자소서를 저장합니다.'
            : '선택한 JD에 저장된 자소서를 수정합니다.'}
        </span>
      </div>
      <Form.Item
        label="연결 JD"
        name="job_description_id"
        extra={isCreateMode ? undefined : '기존 자소서의 연결 JD는 수정하지 않습니다.'}
        rules={[{ required: true, message: '저장할 JD를 선택해 주세요.' }]}
      >
        <Select
          disabled={!isCreateMode}
          onChange={(value) => setSelectedJdId(String(value))}
          options={jdList.map((item) => ({ value: Number(item.id), label: item.title }))}
          placeholder="JD를 선택하세요"
        />
      </Form.Item>
      <Form.Item label="지원자명" name="name" rules={[{ required: true, message: '지원자명을 입력해 주세요.' }]}>
        <Input placeholder="지원자명을 입력하세요" />
      </Form.Item>
      <CollapsibleEditableStringListField
        form={form}
        name="skill"
        label="기술 스택"
        itemLabel="기술 스택"
        placeholder="기술 스택을 입력하세요"
        addLabel="기술 추가"
        emptyText="아직 입력된 기술 스택이 없습니다."
      />
      <Collapse
        className="resume-extra-collapse"
        ghost
        items={[
          {
            key: 'resume-extra',
            label: '추가 이력 정보',
            children: (
              <>
                <Form.Item label="학력">
                  <div className="resume-education-field">
                    <Form.Item label="최종 학위" name={['education_level', 'final_degree']}>
                      <Select options={DEGREE_OPTIONS} />
                    </Form.Item>
                    <Form.Item label="학사 학교명" name={['education_level', 'bachelor']}>
                      <Input placeholder="예: 한국대학교" />
                    </Form.Item>
                    <Form.Item label="석사 학교명" name={['education_level', 'master']}>
                      <Input placeholder="예: 한국대학원" />
                    </Form.Item>
                    <Form.Item label="박사 학교명" name={['education_level', 'doctoral']}>
                      <Input placeholder="예: 한국대학원" />
                    </Form.Item>
                    <Form.Item
                      className="resume-education-field-wide"
                      label="기존 학력 요약"
                      name={['education_level', 'summary']}
                    >
                      <Input placeholder="기존 요약 데이터가 있으면 표시됩니다." />
                    </Form.Item>
                  </div>
                </Form.Item>
                <StructuredResumeListField<ExperienceFormValue>
                  form={form}
                  name="experience"
                  label="경력"
                  addLabel="경력 추가"
                  emptyText="아직 입력된 경력이 없습니다."
                  defaultItem={EMPTY_EXPERIENCE}
                  summaryFormatter={experienceSummary}
                  fields={[
                    { name: 'company_name', label: '회사명', placeholder: '예: 휴머' },
                    { name: 'length', label: '기간', placeholder: '예: 6개월' },
                    { name: 'position', label: '직책', placeholder: '예: 인턴' },
                    {
                      name: 'experience_description',
                      label: '경력 설명',
                      placeholder: '담당 업무와 성과를 입력하세요',
                      input: 'textarea',
                    },
                  ]}
                />
                <CollapsibleEditableStringListField
                  form={form}
                  name="certification"
                  label="자격/인증"
                  itemLabel="자격/인증"
                  placeholder="예: 정보처리기사, SQLD"
                  addLabel="자격/인증 추가"
                  emptyText="아직 입력된 자격/인증이 없습니다."
                />
                <StructuredResumeListField<LanguageFormValue>
                  form={form}
                  name="language"
                  label="언어"
                  addLabel="언어 추가"
                  emptyText="아직 입력된 언어가 없습니다."
                  defaultItem={EMPTY_LANGUAGE}
                  summaryFormatter={languageSummary}
                  fields={[
                    { name: 'language_name', label: '언어명', placeholder: '예: 영어' },
                    { name: 'test_name', label: '시험명', placeholder: '예: TOEIC, OPIC' },
                    { name: 'score', label: '점수/등급', placeholder: '예: 990, IH' },
                  ]}
                />
                <StructuredResumeListField<AwardFormValue>
                  form={form}
                  name="award"
                  label="수상"
                  addLabel="수상 추가"
                  emptyText="아직 입력된 수상 이력이 없습니다."
                  defaultItem={EMPTY_AWARD}
                  summaryFormatter={awardSummary}
                  fields={[
                    { name: 'award_name', label: '수상명', placeholder: '예: 해커톤 우수상' },
                    { name: 'award_from', label: '수여 기관', placeholder: '예: 서울시' },
                    { name: 'time', label: '수상 시점', placeholder: '예: 2024' },
                  ]}
                />
                <StructuredResumeListField<TrainingFormValue>
                  form={form}
                  name="training"
                  label="교육/훈련"
                  addLabel="교육/훈련 추가"
                  emptyText="아직 입력된 교육/훈련이 없습니다."
                  defaultItem={EMPTY_TRAINING}
                  summaryFormatter={trainingSummary}
                  fields={[
                    { name: 'education_name', label: '교육명', placeholder: '예: AI 부트캠프' },
                    { name: 'education_from', label: '교육 기관', placeholder: '예: 패스트캠퍼스' },
                    { name: 'start', label: '시작', placeholder: '예: 2024-01' },
                    { name: 'end', label: '종료', placeholder: '예: 2024-03' },
                    {
                      name: 'education_description',
                      label: '교육 설명',
                      placeholder: '교육 내용과 프로젝트를 입력하세요',
                      input: 'textarea',
                    },
                  ]}
                />
                <StructuredResumeListField<OtherActivityFormValue>
                  form={form}
                  name="other_activity"
                  label="기타 활동"
                  addLabel="기타 활동 추가"
                  emptyText="아직 입력된 기타 활동이 없습니다."
                  defaultItem={EMPTY_OTHER_ACTIVITY}
                  summaryFormatter={otherActivitySummary}
                  fields={[
                    { name: 'activity_name', label: '활동명', placeholder: '예: 오픈소스 기여' },
                    { name: 'start', label: '시작', placeholder: '예: 2023-01' },
                    { name: 'end', label: '종료', placeholder: '예: 2023-12' },
                    {
                      name: 'activity_description',
                      label: '활동 설명',
                      placeholder: '활동 내용과 역할을 입력하세요',
                      input: 'textarea',
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
      <StructuredResumeListField<SelfIntroductionFormValue>
        form={form}
        name="self_intoduction"
        label="자기소개 문항"
        addLabel="자기소개 문항 추가"
        emptyText="아직 입력된 자기소개 문항이 없습니다."
        defaultItem={EMPTY_SELF_INTRODUCTION}
        defaultOpen
        summaryFormatter={selfIntroductionSummary}
        fields={[
          { name: 'question', label: '문항', placeholder: '예: 지원 동기를 작성해 주세요.' },
          {
            name: 'answer',
            label: '답변',
            placeholder: '지원자의 자기소개 답변을 입력하세요',
            input: 'textarea',
          },
        ]}
      />
    </Form>
  );
}
