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
});
