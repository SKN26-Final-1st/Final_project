import { Progress, Table } from 'antd';
import { SectionCard } from '../common/SectionCard';
import type { ApplicantRow } from '../../api/adapters';
import { statusTag } from '../../utils/statusTag';

type ApplicantReviewTableProps = {
  applicants: ApplicantRow[];
};

export function ApplicantReviewTable({ applicants }: ApplicantReviewTableProps) {
  return (
    <SectionCard className="applicant-review-card" title="지원자 검토 목록">
      <Table
        className="desktop-data-table"
        size="middle"
        pagination={false}
        scroll={{ x: 640 }}
        dataSource={applicants}
        columns={[
          { title: '지원자', dataIndex: 'name' },
          { title: '지원 직무', dataIndex: 'role' },
          {
            title: '적합도',
            dataIndex: 'fit',
            render: (value: number) => <Progress className="fit-progress" percent={value} size="small" />,
          },
          { title: '단계', dataIndex: 'stage' },
          {
            title: '상태',
            dataIndex: 'status',
            render: (_value: string, record) => statusTag(record.status, record.statusCode),
          },
        ]}
      />
      <div className="mobile-data-list" aria-label="Applicant review list">
        {applicants.map((applicant) => (
          <article className="mobile-data-card" key={applicant.key}>
            <div className="mobile-data-card-head">
              <div>
                <strong>{applicant.name}</strong>
                <span>{applicant.role}</span>
              </div>
              {statusTag(applicant.status, applicant.statusCode)}
            </div>
            <div className="mobile-data-progress">
              <span>{applicant.stage}</span>
              <Progress className="fit-progress" percent={applicant.fit} size="small" />
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
