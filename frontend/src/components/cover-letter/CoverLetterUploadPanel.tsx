import { Button, Tag, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { EmptyState } from '../common/PageState';
import type { CoverLetterRow } from '../../api/adapters';
import type { Navigate } from '../../types/app';
import { statusTag } from '../../utils/statusTag';

type CoverLetterUploadPanelProps = {
  coverRows: CoverLetterRow[];
  hasSavedResume: boolean;
  analysisDone: boolean;
  navigate: Navigate;
  selectedResumeId: string | null;
  onSelectResume: (resumeId: string) => void;
  onDeleteResume: (resumeId: string) => void;
  canCreateResume?: boolean;
  chatEnabled?: boolean;
  emptyDescription?: string;
};

export function CoverLetterUploadPanel({
  coverRows,
  hasSavedResume,
  analysisDone,
  navigate,
  selectedResumeId,
  onSelectResume,
  onDeleteResume,
  canCreateResume = true,
  chatEnabled = true,
  emptyDescription = '저장된 자소서가 없습니다.',
}: CoverLetterUploadPanelProps) {
  const isWarningStatus = (statusCode: CoverLetterRow['statusCode']) =>
    statusCode === 'onqueue' || statusCode === 'processing' || statusCode === 'needs_review';
  const hasRows = coverRows.length > 0;

  return (
    <>
      <div className="cover-letter-save-hint">
        <p className="list-panel-hint">자소서를 선택하면 오른쪽 작성/수정 폼에 내용이 표시됩니다.</p>
        <strong>{hasSavedResume ? '선택한 자소서를 수정하고 있습니다.' : '아직 선택된 자소서가 없습니다.'}</strong>
        <span>
          {hasSavedResume
            ? '왼쪽 목록에서 자소서를 선택하면 오른쪽 폼에 내용이 로드됩니다.'
            : canCreateResume
              ? '새 자소서 작성 버튼으로 지원서를 저장한 뒤 분석을 요청할 수 있습니다.'
              : 'API Key로 허용된 지원서를 선택해 수정할 수 있습니다.'}
        </span>
      </div>
      {hasRows ? (
        <div className="cover-letter-list" aria-label="Cover letter list">
          {coverRows.map((row) => (
            <div
              role="button"
              tabIndex={0}
              aria-label={`${row.applicant} 자소서 선택`}
              aria-pressed={selectedResumeId === row.key}
              className={`cover-letter-list-card ${selectedResumeId === row.key ? 'active' : ''} ${
                isWarningStatus(row.statusCode) ? 'warning' : ''
              }`}
              key={row.key}
              onClick={() => onSelectResume(row.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectResume(row.key);
                }
              }}
            >
              <Tooltip title="자소서 삭제">
                <Button
                  aria-label={`${row.applicant} 자소서 삭제`}
                  className="jd-card-delete-button"
                  icon={<CloseOutlined />}
                  size="small"
                  type="text"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteResume(row.key);
                  }}
                />
              </Tooltip>
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
            </div>
          ))}
        </div>
      ) : (
        <EmptyState description={emptyDescription} />
      )}
      {analysisDone && chatEnabled && (
        <Button className="mt-16" type="primary" block onClick={() => navigate('/chat')}>
          채팅 화면에서 리포트 확인
        </Button>
      )}
    </>
  );
}
