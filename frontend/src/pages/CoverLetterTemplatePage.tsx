import { Alert, Button, Col, Divider, List, Row, Space, Tag, Tooltip } from 'antd';
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
  const templateGenerated = false;

  return (
    <>
      <PageTitle
        eyebrow="Cover Letter Template"
        title="자기소개서 템플릿 작성"
        description="분석 완료 후 backend가 생성한 면접 질문과 가이드를 표시합니다. 별도 문항 생성/문서 다운로드 API는 아직 없습니다."
        actions={
          <Space wrap>
            <Tooltip title="자기소개서 문항 생성 backend API가 아직 없습니다. 분석 완료 후 면접 질문을 표시합니다.">
              <Button type="primary" icon={<FileSearchOutlined />} disabled>
                분석 결과 사용
              </Button>
            </Tooltip>
            <Tooltip title="템플릿 문서 다운로드 backend API가 아직 없습니다.">
              <Button disabled icon={<DownloadOutlined />}>
                문서
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
        description="자기소개서 템플릿 문서 생성과 다운로드는 현재 backend API가 없어 backend 연동 예정 상태입니다. 분석 결과 기반 질문 데이터는 보존합니다."
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
