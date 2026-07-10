import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useApiAction } from './useApiAction';

describe('useApiAction', () => {
  test('blocks duplicate in-flight actions with the same key immediately', async () => {
    let resolveAction: (() => void) | null = null;
    const action = vi.fn(
      () =>
        new Promise<{ error: false; message: string; data: null }>((resolve) => {
          resolveAction = () => resolve({ error: false, message: 'ok', data: null });
        }),
    );
    const { result } = renderHook(() => useApiAction());

    act(() => {
      void result.current.runApiAction('save', action);
      void result.current.runApiAction('save', action);
    });

    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAction?.();
    });
  });

  test('keeps another action loading when concurrent actions resolve out of order', async () => {
    let resolveFirst: (() => void) | null = null;
    let resolveSecond: (() => void) | null = null;
    const firstAction = vi.fn(
      () =>
        new Promise<{ error: false; message: string; data: null }>((resolve) => {
          resolveFirst = () => resolve({ error: false, message: 'first complete', data: null });
        }),
    );
    const secondAction = vi.fn(
      () =>
        new Promise<{ error: false; message: string; data: null }>((resolve) => {
          resolveSecond = () => resolve({ error: false, message: 'second complete', data: null });
        }),
    );
    const { result } = renderHook(() => useApiAction());

    act(() => {
      void result.current.runApiAction('first', firstAction);
      void result.current.runApiAction('second', secondAction);
    });

    expect(result.current.loadingKey).toBe('second');

    await act(async () => {
      resolveFirst?.();
    });

    expect(result.current.loadingKey).toBe('second');

    await act(async () => {
      resolveSecond?.();
    });

    expect(result.current.loadingKey).toBeNull();
  });

  test('does not let an older timeout clear a newer alert', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useApiAction());

    try {
      act(() => {
        result.current.showAlert({ type: 'success', message: 'first' });
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.showAlert({ type: 'error', message: 'second' });
      });
      act(() => {
        vi.advanceTimersByTime(2400);
      });

      expect(result.current.alert).toEqual({ type: 'error', message: 'second' });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.alert).toBeNull();
    } finally {
      unmount();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
