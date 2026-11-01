import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('../../src/app/globals.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

function parseBlock(selector: string): Record<string, string> {
  // Matches `:root {` or `.dark {` up to the first closing brace at column 0-ish.
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const body = css.match(re)?.[1] ?? '';
  const map: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c;
  const chan = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function ratio(a: string, b: string): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = [
  { name: 'light', tokens: parseBlock(':root') },
  { name: 'dark', tokens: parseBlock('.dark') },
];

describe('design token contrast (docs/ui/design-system.md §Color tokens)', () => {
  it('parsed tokens from globals.css', () => {
    expect(Object.keys(themes[0].tokens).length).toBeGreaterThan(20);
    expect(Object.keys(themes[1].tokens).length).toBeGreaterThan(20);
  });

  for (const { name, tokens } of themes) {
    describe(`${name} theme`, () => {
      // Every X / X-foreground pair must meet AA 4.5:1.
      const pairs = Object.keys(tokens).filter(
        (k) => tokens[`${k}-foreground`] !== undefined && !k.endsWith('-foreground'),
      );
      for (const base of pairs) {
        it(`${base} / ${base}-foreground ≥ 4.5:1`, () => {
          expect(ratio(tokens[base], tokens[`${base}-foreground`])).toBeGreaterThanOrEqual(4.5);
        });
      }

      // input and ring must reach 3:1 against the surfaces they sit on (docs/ui/design-system.md).
      // Form controls sit on `card` (raised surfaces: panels, sheets, forms); the focus ring also
      // appears over the page background. See D-012 for the input-vs-background nuance.
      const controlSurfaces: Record<string, string[]> = {
        input: ['card'],
        ring: ['background', 'card'],
      };
      for (const [control, surfaces] of Object.entries(controlSurfaces)) {
        for (const surface of surfaces) {
          it(`${control} vs ${surface} ≥ 3:1`, () => {
            expect(ratio(tokens[control], tokens[surface])).toBeGreaterThanOrEqual(3);
          });
        }
      }
    });
  }
});
