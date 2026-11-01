// Turn a YouTube URL into its privacy-friendly embed URL, or null when it is not a YouTube link
// (we then show a plain "Watch video" link rather than an embed). Pure, so it is unit-testable.
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1);
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
    else if (parsed.pathname.startsWith('/embed/')) id = parsed.pathname.slice('/embed/'.length);
    else if (parsed.pathname.startsWith('/shorts/')) id = parsed.pathname.slice('/shorts/'.length);
  }

  if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
