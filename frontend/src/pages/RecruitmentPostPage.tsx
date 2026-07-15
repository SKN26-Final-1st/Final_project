import { useState, type Key } from 'react';
import { Button, Col, Row, Space, Tooltip } from 'antd';
import { DownloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import { JdSelectionPanel } from '../components/recruitment/JdSelectionPanel';
import { RecruitmentPreviewPanel } from '../components/recruitment/RecruitmentPreviewPanel';
import { SelectedJdSummary } from '../components/recruitment/SelectedJdSummary';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import { useAppDataQuery } from '../hooks/useAppDataQuery';
import { pageSectionGutter } from '../utils/layout';

export function RecruitmentPostPage() {
  const { data } = useAppDataQuery();
  const [selectedRows, setSelectedRows] = useState<Key[]>([]);
  const jdList = data?.jdList ?? [];
  const recruitmentPreview = data?.recruitmentPreview;
  const postGenerated = false;

  return (
    <div className="recruitment-post-page">
      <PageTitle
        eyebrow="Recruitment Post"
        title="모집 공고 작성"
        description="선택한 JD 정보를 바탕으로 모집 공고 초안을 미리 확인합니다."
        actions={
          <Space wrap>
            <Tooltip title="공고 생성 기능은 준비 중입니다.">
              <Button icon={<FileSearchOutlined />} type="primary" disabled>
                공고 생성
              </Button>
            </Tooltip>
            <Tooltip title="PDF 다운로드 기능은 준비 중입니다.">
              <Button disabled icon={<DownloadOutlined />}>
                PDF
              </Button>
            </Tooltip>
          </Space>
        }
      />
      <Row className="section-row" gutter={pageSectionGutter}>
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
            {recruitmentPreview && (
              <RecruitmentPreviewPanel preview={recruitmentPreview} postGenerated={postGenerated} />
            )}
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
