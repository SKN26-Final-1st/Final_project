import type { Key } from 'react';
import { Button, Col, Row, Space } from 'antd';
import { DownloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import { JdSelectionPanel } from '../components/recruitment/JdSelectionPanel';
import { RecruitmentPreviewPanel } from '../components/recruitment/RecruitmentPreviewPanel';
import { SelectedJdSummary } from '../components/recruitment/SelectedJdSummary';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem, RecruitmentPreview } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { KeySetter, RunApiAction } from '../types/app';

type RecruitmentPostPageProps = {
  jdList: JdItem[];
  recruitmentPreview: RecruitmentPreview;
  selectedRows: Key[];
  postGenerated: boolean;
  loadingKey: string | null;
  setSelectedRows: KeySetter;
  setPostGenerated: (value: boolean) => void;
  runApiAction: RunApiAction;
};

export function RecruitmentPostPage({
  jdList,
  recruitmentPreview,
  selectedRows,
  postGenerated,
  loadingKey,
  setSelectedRows,
  setPostGenerated,
  runApiAction,
}: RecruitmentPostPageProps) {
  return (
    <div className="recruitment-post-page">
      <PageTitle
        eyebrow="Recruitment Post"
        title="모집 공고 작성"
        description="복수 JD를 선택하고 생성된 모집 공고 미리보기와 PDF 다운로드 흐름을 확인합니다."
        actions={
          <Space wrap>
            <Button
              icon={<FileSearchOutlined />}
              type="primary"
              disabled={!selectedRows.length || loadingKey === 'post-generate'}
              onClick={() =>
                void runApiAction(
                  'post-generate',
                  () => apiClient.generateRecruitmentPost(selectedRows.map(String)),
                  () => setPostGenerated(true),
                )
              }
            >
              {loadingKey === 'post-generate' ? <InlineLoading label="생성 중" /> : '공고 생성'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => void runApiAction('post-pdf', apiClient.downloadRecruitmentPdf)}>
              PDF
            </Button>
          </Space>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={13}>
          <SectionCard title="JD 선택">
            <JdSelectionPanel jdList={jdList} selectedRows={selectedRows} setSelectedRows={setSelectedRows} />
          </SectionCard>
        </Col>
        <Col xs={24} xl={11}>
          <SectionCard title="선택 요약">
            <SelectedJdSummary jdList={jdList} selectedRows={selectedRows} />
          </SectionCard>
        </Col>
        <Col span={24}>
          <SectionCard title="공고 미리보기">
            <RecruitmentPreviewPanel preview={recruitmentPreview} postGenerated={postGenerated} />
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
