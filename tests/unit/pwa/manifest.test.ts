import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';
import { PWA_COLORS } from '@/lib/pwa/colors';

describe('PWA manifest', () => {
  const m = manifest();

  it('declares an installable standalone client app (A1)', () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe('/client');
    expect(m.display).toBe('standalone');
    expect(m.theme_color).toBe(PWA_COLORS.themeColor);
    expect(m.background_color).toBe(PWA_COLORS.backgroundColor);
  });

  it('ships a 192px and a 512px icon, at least one maskable (A1)', () => {
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === '192x192')).toBe(true);
    expect(icons.some((i) => i.sizes === '512x512')).toBe(true);
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(icon.type).toBe('image/png');
      expect(icon.src.startsWith('/icons/')).toBe(true);
    }
  });
});

describe('PWA colours', () => {
  it('are valid hex tokens', () => {
    expect(PWA_COLORS.themeColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(PWA_COLORS.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
