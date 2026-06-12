import type { Key } from 'react';
import { Button, Col, Row, Space, Tooltip } from 'antd';
import { DownloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import { JdSelectionPanel } from '../components/recruitment/JdSelectionPanel';
import { RecruitmentPreviewPanel } from '../components/recruitment/RecruitmentPreviewPanel';
import { SelectedJdSummary } from '../components/recruitment/SelectedJdSummary';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem, RecruitmentPreview } from '../api/adapters';
import type { KeySetter } from '../types/app';

type RecruitmentPostPageProps = {
  jdList: JdItem[];
  recruitmentPreview: RecruitmentPreview;
  selectedRows: Key[];
  postGenerated: boolean;
  setSelectedRows: KeySetter;
};

export function RecruitmentPostPage({
  jdList,
  recruitmentPreview,
  selectedRows,
  postGenerated,
  setSelectedRows,
}: RecruitmentPostPageProps) {
  return (
    <div className="recruitment-post-page">
      <PageTitle
        eyebrow="Recruitment Post"
        title="모집 공고 작성"
        description="실제 JD 데이터를 바탕으로 미리보기를 표시합니다. 공고 생성과 PDF 다운로드는 현재 backend API가 없어 비활성화했습니다."
        actions={
          <Space wrap>
            <Tooltip title="모집 공고 생성 backend API가 아직 없습니다.">
              <Button icon={<FileSearchOutlined />} type="primary" disabled>
                공고 생성
              </Button>
            </Tooltip>
            <Tooltip title="모집 공고 PDF 다운로드 backend API가 아직 없습니다.">
              <Button disabled icon={<DownloadOutlined />}>
                PDF
              </Button>
            </Tooltip>
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
