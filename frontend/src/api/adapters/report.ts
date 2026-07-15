import type { ChatMessage } from '../../data/appConfig';
import type { AnalysisReport, InterviewQuestion, JobDescription, Resume } from '../../data/backendTypes';
import { findJob, toDisplayText } from './common';

export type AnalysisReportData = {
  reportId: string;
  applicantName: string;
  jobTitle: string;
  tabs: { key: string; label: string; title: string; content: string }[];
  exampleQuestions: string[];
  chatMessages: ChatMessage[];
};

function formatList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '등록된 항목이 없습니다.';
}

function formatChecklist(report: AnalysisReport) {
  const rows = Array.isArray(report.checklist) ? report.checklist : [];
  const lines = rows
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const checklistItem = item as Partial<{ content: unknown; result: unknown }>;
      const content = toDisplayText(checklistItem.content);
      return content ? `${checklistItem.result ? '충족' : '미충족'} · ${content}` : '';
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n') : '체크리스트가 없습니다.';
}

export function mapAnalysisReport(
  data: AnalysisReport | null | undefined,
  resumes: Resume[],
  jobDescriptions: JobDescription[],
  interviewQuestions: InterviewQuestion[],
): AnalysisReportData {
  if (!data) {
    return {
      reportId: '',
      applicantName: '분석 리포트 없음',
      jobTitle: '분석 완료 후 표시됩니다.',
      tabs: [
        {
          key: 'empty',
          label: '대기',
          title: '분석 결과가 없습니다.',
          content: '지원서를 저장하고 분석 요청을 완료하면 리포트와 면접 질문이 표시됩니다.',
        },
      ],
      exampleQuestions: [],
      chatMessages: [
        { role: 'assistant', text: '아직 분석 리포트가 없습니다. JD와 지원서를 등록한 뒤 분석을 요청하세요.' },
      ],
    };
  }

  const resume = resumes.find((item) => item.id === data.resume_id);
  const job = resume ? findJob(jobDescriptions, resume) : undefined;
  const questions = interviewQuestions.filter((question) => question.resume_id === data.resume_id);

  return {
    reportId: String(data.id),
    applicantName: resume?.name ?? '지원자 정보 없음',
    jobTitle: job?.job_name ?? '연결된 JD 없음',
    tabs: [
      {
        key: 'summary',
        label: '요약',
        title: `${data.overall_grade} 등급 · 종합 요약`,
        content: `${data.overall_summary}\n\n${data.candidate_summary}`,
      },
      { key: 'checklist', label: '체크리스트', title: 'JD 기준 충족 여부', content: formatChecklist(data) },
      { key: 'competency', label: '역량', title: '역량 분석', content: formatList(data.competency_analysis) },
      { key: 'fit', label: '적합성', title: '직무/조직 적합성', content: data.fit_analysis || '등록된 항목이 없습니다.' },
      {
        key: 'risk',
        label: '검토',
        title: '강점·우려·확인 포인트',
        content: `강점\n${formatList(data.strength)}\n\n우려\n${formatList(data.concern)}\n\n확인 포인트\n${formatList(data.check_point)}`,
      },
      { key: 'comment', label: '코멘트', title: '최종 코멘트', content: data.final_comment },
    ],
    exampleQuestions: questions.map((question) => question.question),
    chatMessages: [
      {
        role: 'assistant',
        text: 'JD와 사용 가이드를 중심으로 답변할 수 있습니다. 리포트와 면접 질문은 화면에서 확인 가능한 참고 자료입니다.',
      },
      { role: 'user', text: '이 지원자의 추가 검증 포인트를 알려줘.' },
      { role: 'assistant', text: data.check_point.join(' ') },
    ],
  };
}
