import { Button, Col, Divider, List, Row, Space, Tag } from 'antd';
import { DownloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import { EmptyState } from '../components/common/PageState';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem, TemplateQuestion } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { RunApiAction } from '../types/app';

type CoverLetterTemplatePageProps = {
  selectedJd: JdItem | null;
  templateQuestions: TemplateQuestion[];
  templateGenerated: boolean;
  loadingKey: string | null;
  setTemplateGenerated: (value: boolean) => void;
  runApiAction: RunApiAction;
};

export function CoverLetterTemplatePage({
  selectedJd,
  templateQuestions,
  templateGenerated,
  loadingKey,
  setTemplateGenerated,
  runApiAction,
}: CoverLetterTemplatePageProps) {
  return (
    <>
      <PageTitle
        eyebrow="Cover Letter Template"
        title="자기소개서 포맷 작성"
        description="JD 요약을 바탕으로 자기소개서 문항과 작성 가이드 생성 결과를 표시합니다."
        actions={
          <Space wrap>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              disabled={!selectedJd || loadingKey === 'template-generate'}
              onClick={() =>
                selectedJd &&
                void runApiAction(
                  'template-generate',
                  () => apiClient.generateCoverLetterTemplate(selectedJd.id),
                  () => setTemplateGenerated(true),
                )
              }
            >
              {loadingKey === 'template-generate' ? <InlineLoading label="생성 중" /> : '문항 생성'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => void runApiAction('template-doc', apiClient.downloadTemplateDocument)}>
              문서
            </Button>
          </Space>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={8}>
          <SectionCard title="JD 요약">
            {selectedJd ? (
              <>
                <strong>{selectedJd.title}</strong>
                <p className="muted">{selectedJd.summary}</p>
                <Divider />
                <Space wrap>
                  {selectedJd.stack.map((stack) => (
                    <Tag key={stack}>{stack}</Tag>
                  ))}
                </Space>
              </>
            ) : (
              <EmptyState description="선택된 JD가 없습니다." />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard title="문항 및 작성 가이드">
            {templateGenerated ? (
              <List
                dataSource={templateQuestions}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.title} description={item.guide} />
                  </List.Item>
                )}
              />
            ) : (
              <EmptyState description="생성된 문항이 없습니다." />
            )}
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
