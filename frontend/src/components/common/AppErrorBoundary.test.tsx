import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';
import { API_KEY_SESSION_STORAGE_KEY } from '../../utils/apiKeySession';

const logout = vi.hoisted(() => vi.fn());

vi.mock('../../api/backendClient', () => ({
  apiClient: { logout },
}));

const PRIVATE_ERROR_DETAIL = 'api-key=secret candidate=private stack trace';

function ThrowingView(): never {
  throw new Error(PRIVATE_ERROR_DETAIL);
}

function renderBoundary(children: React.ReactNode, queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logout.mockResolvedValue({ error: false, data: { logout: true } });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an accessible recovery screen without exposing internal error details', async () => {
    const reloadPage = vi.fn();
    const user = userEvent.setup();

    renderBoundary(
      <AppErrorBoundary reloadPage={reloadPage}>
        <ThrowingView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('화면을 표시하지 못했습니다.');
    expect(screen.queryByText(PRIVATE_ERROR_DETAIL)).not.toBeInTheDocument();
    expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('resets the boundary and moves to the login route', async () => {
    const user = userEvent.setup();
    logout.mockReturnValue(new Promise(() => undefined));
    const queryClient = new QueryClient();
    queryClient.setQueryData(['checklist', '77'], { content: 'sensitive checklist' });
    queryClient.getMutationCache().build(queryClient, {
      mutationKey: ['sensitive-save'],
      mutationFn: async () => ({ saved: true }),
    });
    window.sessionStorage.setItem(API_KEY_SESSION_STORAGE_KEY, 'stored-api-key');

    renderBoundary(
      <AppErrorBoundary reloadPage={vi.fn()}>
        <Routes>
          <Route path="/dashboard" element={<ThrowingView />} />
          <Route path="/login" element={<h1>로그인 화면</h1>} />
        </Routes>
      </AppErrorBoundary>,
      queryClient,
    );

    await user.click(screen.getByRole('button', { name: '로그인 화면으로 이동' }));

    expect(await screen.findByRole('heading', { name: '로그인 화면' })).toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith({
      authFailurePolicy: 'local',
      signal: expect.any(AbortSignal),
    });
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(queryClient.getMutationCache().getAll()).toEqual([]);
    expect(window.sessionStorage.getItem(API_KEY_SESSION_STORAGE_KEY)).toBeNull();
  });
});
