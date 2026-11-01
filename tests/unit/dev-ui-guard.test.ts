import { afterEach, describe, expect, it, vi } from 'vitest';
import { devUiEnabled } from '@/lib/dev';

afterEach(() => vi.unstubAllEnvs());

describe('devUiEnabled (/dev/ui route guard)', () => {
  it('404s in a production build without the flag', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEV_UI', '');
    expect(devUiEnabled()).toBe(false);
  });

  it('renders in production when ENABLE_DEV_UI=1 (the e2e server)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEV_UI', '1');
    expect(devUiEnabled()).toBe(true);
  });

  it('renders in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_DEV_UI', '');
    expect(devUiEnabled()).toBe(true);
  });
});
