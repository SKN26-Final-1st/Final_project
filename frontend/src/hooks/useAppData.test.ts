import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { getAppDataErrorMessage } from './useAppData';

describe('getAppDataErrorMessage', () => {
  it('hides schema internals behind a user-facing response error', () => {
    const result = z.object({ status: z.literal('done') }).safeParse({ status: 'processing' });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(getAppDataErrorMessage(result.error)).toBe(
      '서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('preserves actionable API error messages', () => {
    expect(getAppDataErrorMessage(new Error('로그인 세션이 만료되었습니다.'))).toBe(
      '로그인 세션이 만료되었습니다.',
    );
  });
});
