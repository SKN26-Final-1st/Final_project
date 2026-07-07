import { Button, Col, Divider, List, Row, Space, Tag, Tooltip } from 'antd';
import { DownloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import { useAppDataQuery } from '../hooks/useAppDataQuery';
import { pageSectionGutter } from '../utils/layout';

export function CoverLetterTemplatePage() {
  const { data } = useAppDataQuery();
  const selectedJd = data?.jdList[0] ?? null;
  const templateQuestions = data?.templateQuestions ?? [];

  return (
    <>
      <PageTitle
        eyebrow="Cover Letter Template"
        title="자기소개서 템플릿 작성"
        description="분석 결과에서 확인한 면접 질문과 작성 가이드를 정리해 보여줍니다."
        actions={
          <Space wrap>
            <Tooltip title="문항 생성 기능은 준비 중입니다.">
              <Button type="primary" icon={<FileSearchOutlined />} disabled>
                분석 결과 사용
              </Button>
            </Tooltip>
            <Tooltip title="문서 다운로드 기능은 준비 중입니다.">
              <Button disabled icon={<DownloadOutlined />}>
                문서
              </Button>
            </Tooltip>
          </Space>
        }
      />
      <Row className="section-row" gutter={pageSectionGutter}>
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
            {templateQuestions.length ? (
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
