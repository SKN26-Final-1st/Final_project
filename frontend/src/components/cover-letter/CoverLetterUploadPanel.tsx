import { Button, Tag } from 'antd';
import { EmptyState } from '../common/PageState';
import type { CoverLetterRow } from '../../api/adapters';
import type { Navigate } from '../../types/app';
import { statusTag } from '../../utils/statusTag';

type CoverLetterUploadPanelProps = {
  coverRows: CoverLetterRow[];
  hasSavedResume: boolean;
  analysisDone: boolean;
  navigate: Navigate;
};

export function CoverLetterUploadPanel({
  coverRows,
  hasSavedResume,
  analysisDone,
  navigate,
}: CoverLetterUploadPanelProps) {
  const isWarningStatus = (statusCode: CoverLetterRow['statusCode']) =>
    statusCode === 'onqueue' || statusCode === 'processing' || statusCode === 'needs_review';
  const hasRows = coverRows.length > 0;

  return (
    <>
      <div className="cover-letter-save-hint">
        <strong>{hasSavedResume ? '저장된 자소서가 있습니다.' : '아직 저장된 자소서가 없습니다.'}</strong>
        <span>
          {hasSavedResume
            ? '오른쪽 작성 폼을 수정한 뒤 저장하면 같은 JD의 자소서가 업데이트됩니다.'
            : '오른쪽 작성 폼을 작성한 뒤 저장하면 분석 요청을 진행할 수 있습니다.'}
        </span>
      </div>
      {hasRows ? (
        <div className="cover-letter-list" aria-label="Cover letter list">
          {coverRows.map((row) => (
            <article
              className={`cover-letter-list-card ${isWarningStatus(row.statusCode) ? 'warning' : ''}`}
              key={row.key}
            >
              <div className="cover-letter-list-head">
                <strong>{row.applicant}</strong>
                {statusTag(row.status, row.statusCode)}
              </div>
              <span className="cover-letter-list-jd">{row.jd}</span>
              <div className="cover-letter-list-tags">
                {row.skills.slice(0, 3).map((skill) => (
                  <Tag key={skill}>{skill}</Tag>
                ))}
                {row.experienceCount > 0 && <Tag color="geekblue">경력 {row.experienceCount}건</Tag>}
                {row.reviewed && <Tag color="green">검토 완료</Tag>}
              </div>
              <div className="cover-letter-list-score">
                <span>점수</span>
                <strong>{row.score}</strong>
              </div>
              <span className="cover-letter-list-updated">최근 수정 {row.updatedAt}</span>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState description="저장된 자소서가 없습니다." />
      )}
      {analysisDone && (
        <Button className="mt-16" type="primary" block onClick={() => navigate('/chat')}>
          채팅 화면에서 리포트 확인
        </Button>
      )}
    </>
  );
}
