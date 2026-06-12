import { EmptyState } from '../common/PageState';
import type { RecruitmentPreview } from '../../api/adapters';

type RecruitmentPreviewPanelProps = {
  preview: RecruitmentPreview;
  postGenerated: boolean;
};

export function RecruitmentPreviewPanel({ preview, postGenerated }: RecruitmentPreviewPanelProps) {
  if (!postGenerated) {
    return <EmptyState description="생성된 공고가 없습니다." />;
  }

  return (
    <div className="document-preview">
      <h2>{preview.title}</h2>
      {preview.sections.map((section) => (
        <p key={section}>{section}</p>
      ))}
    </div>
  );
}
