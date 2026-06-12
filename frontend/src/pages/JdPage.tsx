import { Button, Col, Row, Space } from 'antd';
import { DeleteOutlined, FileSearchOutlined } from '@ant-design/icons';
import { JdEditorPanel } from '../components/jd/JdEditorPanel';
import { JdListPanel } from '../components/jd/JdListPanel';
import { EmptyState } from '../components/common/PageState';
import { InlineLoading } from '../components/common/InlineLoading';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction, ShowAlert } from '../types/app';

type JdPageProps = {
  jdList: JdItem[];
  selectedJdId: string | null;
  selectedJd: JdItem | null;
  loadingKey: string | null;
  setSelectedJdId: (id: string) => void;
  runApiAction: RunApiAction;
  navigate: Navigate;
  showAlert: ShowAlert;
};

export function JdPage({
  jdList,
  selectedJdId,
  selectedJd,
  loadingKey,
  setSelectedJdId,
  runApiAction,
  navigate,
  showAlert,
}: JdPageProps) {
  return (
    <>
      <PageTitle
        eyebrow="JD Management"
        title="JD 관리"
        description="JD 목록과 작성 폼을 좌우로 배치해 저장, 삭제, 분석 요청 흐름을 확인합니다."
        actions={
          <Space wrap>
            <Button icon={<DeleteOutlined />} onClick={() => showAlert({ type: 'warning', message: '삭제 확인 목업을 표시했습니다.' })}>
              삭제
            </Button>
            <Button
              type="primary"
              icon={<FileSearchOutlined />}
              disabled={!selectedJd || loadingKey === 'jd-analysis'}
              onClick={() =>
                selectedJd &&
                void runApiAction(
                  'jd-analysis',
                  () => apiClient.requestJobAnalysis(selectedJd.id),
                  () => navigate('/cover-letter'),
                )
              }
            >
              {loadingKey === 'jd-analysis' ? <InlineLoading label="분석 중" /> : '분석 요청'}
            </Button>
          </Space>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={8}>
          <SectionCard title="JD 목록">
            {jdList.length ? (
              <JdListPanel jdList={jdList} selectedJdId={selectedJdId} setSelectedJdId={setSelectedJdId} />
            ) : (
              <EmptyState description="등록된 JD가 없습니다." />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard title="JD 작성/수정">
            {selectedJd ? (
              <JdEditorPanel selectedJd={selectedJd} navigate={navigate} showAlert={showAlert} />
            ) : (
              <EmptyState description="수정할 JD를 선택하세요." />
            )}
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
