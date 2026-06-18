import { BookOutlined } from '@ant-design/icons';
import { Prompts } from '@ant-design/x';
import { Col, Row } from 'antd';
import type { JdItem } from '../../api/adapters';
import type { AnalysisReport, InterviewQuestion, Resume } from '../../data/backendTypes';
import { buildChatContextData } from './chatContextData';

type DocumentSearchContextPanelProps = {
  jdList: JdItem[];
  resumes: Resume[];
  analysisReports: AnalysisReport[];
  interviewQuestions: InterviewQuestion[];
  setChatInput: (value: string) => void;
};

export function DocumentSearchContextPanel({
  jdList,
  resumes,
  analysisReports,
  interviewQuestions,
  setChatInput,
}: DocumentSearchContextPanelProps) {
  const { collections, prompts } = buildChatContextData({
    jdList,
    resumes,
    analysisReports,
    interviewQuestions,
  });

  return (
    <div className="document-context-panel">
      <div className="context-card document-context-head">
        <div className="document-context-icon">
          <BookOutlined />
        </div>
        <div>
          <strong>참조 가능한 데이터</strong>
          <span>
            AI 답변은 접근 가능한 JD와 사용 가이드를 중심으로 생성됩니다. 리포트와 면접 질문은 현재 화면에서 확인할 수
            있는 관련 자료로만 표시합니다.
          </span>
        </div>
      </div>

      <Row gutter={[12, 12]} className="document-collection-grid">
        {collections.map((item) => (
          <Col xs={24} sm={12} key={item.key}>
            <button type="button" className="document-collection-card" onClick={() => setChatInput(`${item.title}에 대해 알려줘`)}>
              <span className="document-collection-icon">{item.icon}</span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
              {item.count && <em>{item.count}</em>}
            </button>
          </Col>
        ))}
      </Row>

      <div className="document-suggestions">
        {prompts.length ? (
          <Prompts
            items={prompts.map((prompt) => ({
              key: prompt.key,
              label: prompt.label,
            }))}
            onItemClick={({ data }) => setChatInput(String(data.label ?? data.key))}
            title="추천 질문"
            wrap
          />
        ) : (
          <p className="document-empty-note">저장된 JD가 생기면 추천 질문을 표시합니다.</p>
        )}
      </div>
    </div>
  );
}
