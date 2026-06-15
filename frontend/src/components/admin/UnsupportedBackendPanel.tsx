import { Alert } from 'antd';
import { SectionCard } from '../common/SectionCard';

export function UnsupportedBackendPanel() {
  return (
    <SectionCard title="backend 미지원 기능">
      <Alert
        showIcon
        type="warning"
        title="표시 전용"
        description="플랜 목록, 결제/구독 변경, 포인트 충전 이력, 일반/기업 고객 구분, 조직 멤버 권한 관리는 현재 backend endpoint가 없어 임의 호출하지 않습니다."
      />
    </SectionCard>
  );
}
