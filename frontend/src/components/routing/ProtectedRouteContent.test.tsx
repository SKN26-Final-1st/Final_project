import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { getAuthCapabilities } from '../../utils/authCapabilities';
import { ProtectedRouteContent } from './ProtectedRouteContent';

vi.mock('../../pages/AdminPage', () => ({ AdminPage: () => <div>admin-page</div> }));
vi.mock('../../pages/AnalysisReportPage', () => ({ AnalysisReportPage: () => <div>report-page</div> }));
vi.mock('../../pages/ChatPage', () => ({ ChatPage: () => <div>chat-page</div> }));
vi.mock('../../pages/CompanyPage', () => ({ CompanyPage: () => <div>company-page</div> }));
vi.mock('../../pages/CoverLetterPage', () => ({ CoverLetterPage: () => <div>resume-page</div> }));
vi.mock('../../pages/CoverLetterTemplatePage', () => ({ CoverLetterTemplatePage: () => <div>template-page</div> }));
vi.mock('../../pages/DashboardPage', () => ({ DashboardPage: () => <div>dashboard-page</div> }));
vi.mock('../../pages/JdPage', () => ({ JdPage: () => <div>jd-page</div> }));
vi.mock('../../pages/MyPage', () => ({ MyPage: () => <div>mypage</div> }));
vi.mock('../../pages/RecruitmentPostPage', () => ({ RecruitmentPostPage: () => <div>recruitment-page</div> }));

function LocationDisplay() {
  return <output aria-label="current route">{useLocation().pathname}</output>;
}

function renderProtectedAdmin(authMode: 'account' | 'apiKey') {
  const capabilities = getAuthCapabilities(authMode);

  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LocationDisplay />
              <ProtectedRouteContent
                route="/admin"
                loading={false}
                error={null}
                hasData
                capabilities={capabilities}
                apiKeyHomeRoute="/jd"
                authMode={authMode}
                loadingKey={null}
                mode="light"
                navigate={vi.fn()}
                reload={vi.fn().mockResolvedValue(undefined)}
                runApiAction={vi.fn()}
                setIsAuthenticated={vi.fn()}
                showAlert={vi.fn()}
              />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRouteContent', () => {
  it('redirects direct API Key access to a forbidden route without rendering the page', async () => {
    renderProtectedAdmin('apiKey');

    expect(await screen.findByLabelText('current route')).toHaveTextContent('/jd');
    expect(screen.queryByText('admin-page')).not.toBeInTheDocument();
  });

  it('keeps the same route available for an account session', () => {
    renderProtectedAdmin('account');

    expect(screen.getByLabelText('current route')).toHaveTextContent('/admin');
    expect(screen.getByText('admin-page')).toBeInTheDocument();
  });
});
