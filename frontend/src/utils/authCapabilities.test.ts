import { describe, expect, it } from 'vitest';
import { getAuthCapabilities } from './authCapabilities';

describe('getAuthCapabilities', () => {
  it('keeps all account management capabilities enabled for account sessions', () => {
    const capabilities = getAuthCapabilities('account');

    expect(capabilities.routes).toContain('/admin');
    expect(capabilities.jd.create).toBe(true);
    expect(capabilities.checklist.create).toBe(true);
    expect(capabilities.resume.create).toBe(true);
    expect(capabilities.account.manage).toBe(true);
  });

  it('limits API Key sessions without removing supported edit and analysis actions', () => {
    const capabilities = getAuthCapabilities('apiKey');

    expect(capabilities.routes).toEqual(['/jd', '/cover-letter', '/analysis-report']);
    expect(capabilities.jd.create).toBe(false);
    expect(capabilities.checklist.create).toBe(false);
    expect(capabilities.resume.create).toBe(false);
    expect(capabilities.jd.edit).toBe(true);
    expect(capabilities.resume.analyze).toBe(true);
    expect(capabilities.report.delete).toBe(true);
    expect(capabilities.account.manage).toBe(false);
  });
});
