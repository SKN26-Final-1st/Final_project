import { useState, type Key } from 'react';
import { Alert, Button, Col, Row, Space, Tooltip } from 'antd';
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
        description="실제 JD 데이터를 바탕으로 미리보기를 표시합니다. 공고 생성과 PDF 다운로드는 현재 backend API가 없어 비활성화되어 있습니다."
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
      <Alert
        showIcon
        className="planned-mvp-alert"
        type="info"
        message="후순위 MVP"
        description="모집 공고 생성과 PDF 다운로드는 현재 backend API가 없어 backend 연동 예정 상태입니다. 기존 화면은 보존하되 실제 동작 버튼은 비활성화되어 있습니다."
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
