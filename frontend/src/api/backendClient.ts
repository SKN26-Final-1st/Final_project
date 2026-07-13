import { authAccountClient } from './clients/authAccountClient';
import { chatClient } from './clients/chatClient';
import { companyAuthKeyClient } from './clients/companyAuthKeyClient';
import { jdChecklistClient } from './clients/jdChecklistClient';
import { resumeReportClient } from './clients/resumeReportClient';
import { dashboardSourceClient } from './services/dashboardSource';

/**
 * Public compatibility façade. Domain clients own endpoint and parsing logic;
 * application callers keep the existing apiClient import and method names.
 */
export const apiClient = {
  ...authAccountClient,
  ...companyAuthKeyClient,
  ...dashboardSourceClient,
  ...jdChecklistClient,
  ...resumeReportClient,
  ...chatClient,
};
