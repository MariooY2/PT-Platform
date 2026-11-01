import { ImageResponse } from 'next/og';
import { PWA_COLORS } from '@/lib/pwa/colors';

// Maskable PWA icons rendered on demand — no binary assets, no new dependency (next/og ships with
// Next). The manifest (src/app/manifest.ts) references /icons/192 and /icons/512. ImageResponse sets
// the `image/png` content-type itself. For maskable safety the whole canvas is filled with the brand
// background and the glyph is kept well inside the central safe zone.
const ALLOWED = new Set([192, 512]);

export function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  return render(params);
}

async function render(params: Promise<{ size: string }>) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED.has(size)) {
    return new Response(null, { status: 404 });
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PWA_COLORS.themeColor,
        color: PWA_COLORS.iconForeground,
        fontSize: size * 0.42,
        fontWeight: 700,
        letterSpacing: size * -0.01,
      }}
    >
      PT
    </div>,
    { width: size, height: size },
  );
}
