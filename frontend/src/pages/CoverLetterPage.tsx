import { Button, Col, Row } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { CoverLetterInputPanel } from '../components/cover-letter/CoverLetterInputPanel';
import { CoverLetterUploadPanel } from '../components/cover-letter/CoverLetterUploadPanel';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { CoverLetterDraft, CoverLetterRow, JdItem } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction } from '../types/app';

type CoverLetterPageProps = {
  jdList: JdItem[];
  selectedJdId: string | null;
  draft: CoverLetterDraft;
  coverRows: CoverLetterRow[];
  coverUploaded: boolean;
  analysisDone: boolean;
  loadingKey: string | null;
  setSelectedJdId: (id: string) => void;
  setCoverUploaded: (value: boolean) => void;
  setAnalysisDone: (value: boolean) => void;
  runApiAction: RunApiAction;
  navigate: Navigate;
};

export function CoverLetterPage({
  jdList,
  selectedJdId,
  draft,
  coverRows,
  coverUploaded,
  analysisDone,
  loadingKey,
  setSelectedJdId,
  setCoverUploaded,
  setAnalysisDone,
  runApiAction,
  navigate,
}: CoverLetterPageProps) {
  return (
    <>
      <PageTitle
        eyebrow="Resume"
        title="지원서 입력"
        description="Resume 컬럼 구조에 맞춰 지원자 정보와 자기소개 문항/답변 데이터를 확인합니다."
        actions={
          <Button
            type="primary"
            icon={<FileSearchOutlined />}
            disabled={!selectedJdId || loadingKey === 'cover-analysis'}
            onClick={() =>
              selectedJdId &&
              void runApiAction(
                'cover-analysis',
                () => apiClient.requestCoverLetterAnalysis(selectedJdId),
                () => setAnalysisDone(true),
              )
            }
          >
            {loadingKey === 'cover-analysis' ? <InlineLoading label="분석 중" /> : '분석 요청'}
          </Button>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={11}>
          <SectionCard title="지원서 입력">
            <CoverLetterInputPanel
              selectedJdId={selectedJdId}
              jdList={jdList}
              draft={draft}
              setSelectedJdId={setSelectedJdId}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={13}>
          <SectionCard title="지원서 데이터 미리보기">
            <CoverLetterUploadPanel
              draft={draft}
              coverRows={coverRows}
              coverUploaded={coverUploaded}
              analysisDone={analysisDone}
              runApiAction={runApiAction}
              setCoverUploaded={setCoverUploaded}
              navigate={navigate}
            />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
