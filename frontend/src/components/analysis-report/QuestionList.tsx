import { useState } from 'react';
import { Button } from 'antd';
import type { InterviewQuestion } from '../../data/backendTypes';

type QuestionListProps = {
  questions: InterviewQuestion[];
};

function questionKey(question: InterviewQuestion, index: number) {
  return String(question.id ?? `${question.question}-${index}`);
}

export function QuestionList({ questions }: QuestionListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openQuestionKey, setOpenQuestionKey] = useState<string | null>(null);

  if (!questions.length) {
    return <p className="muted">추천 면접 질문이 없습니다.</p>;
  }

  const visibleQuestions = isExpanded ? questions : questions.slice(0, 3);
  const hiddenCount = Math.max(questions.length - visibleQuestions.length, 0);
  const visibleQuestionKeys = new Set(visibleQuestions.map((question, index) => questionKey(question, index)));
  const effectiveOpenKey = openQuestionKey && visibleQuestionKeys.has(openQuestionKey) ? openQuestionKey : null;

  return (
    <div className="analysis-report-question-compact">
      <div className="analysis-report-question-list">
        {visibleQuestions.map((item, index) => {
          const key = questionKey(item, index);
          const active = key === effectiveOpenKey;

          return (
            <button
              className={`analysis-report-question ${active ? 'active' : ''}`}
              key={key}
              type="button"
              aria-expanded={active}
              onClick={() => setOpenQuestionKey((current) => (current === key ? null : key))}
            >
              <span>질문</span>
              <strong>{item.question}</strong>
              {active ? (
                <span className="analysis-report-question-inline-detail">
                  <span className="analysis-report-question-detail-label">예상 / 모범 답변</span>
                  <span className="analysis-report-question-detail-copy">{item.answer || '답변이 없습니다.'}</span>
                  <span className="analysis-report-question-detail-label">질문 의도</span>
                  <span className="analysis-report-question-detail-copy">{item.purpose || '질문 의도가 없습니다.'}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {questions.length > 3 ? (
        <Button
          className="compact-text-list-toggle"
          size="small"
          type="link"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? '접기' : `전체 보기 (+${hiddenCount})`}
        </Button>
      ) : null}
    </div>
  );
}
