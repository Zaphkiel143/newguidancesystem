// Turns what a Guidance Associate pastes into a Facebook post URL

export type FacebookUrlResult = { ok: true; url: string } | { ok: false; error: string };

const HOST = /(^|\.)facebook\.com$|(^|\.)fb\.watch$/;

function fromEmbedCode(input: string): string | null {
  // <iframe src="https://www.facebook.com/plugins/post.php?href=…&…">
  const plugin = input.match(/plugins\/(?:post|video)\.php\?([^"'\s>]+)/);
  if (plugin) {
    const href = new URLSearchParams(plugin[1].replace(/&amp;/g, "&")).get("href");
    if (href) return href;
  }
  // <div class="fb-post" data-href="…">
  const dataHref = input.match(/data-href=["']([^"']+)["']/);
  return dataHref ? dataHref[1] : null;
}

export function normalizeFacebookPostUrl(raw: string): FacebookUrlResult {
  const input = raw.trim();
  const candidate = input.startsWith("http") && !input.includes("<") ? input : fromEmbedCode(input) ?? input;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "Paste the post's link or its embed code from Facebook." };
  }
  if (url.protocol !== "https:" || !HOST.test(url.hostname)) {
    return { ok: false, error: "The link should start with https://www.facebook.com/." };
  }
  if (url.pathname.startsWith("/share/")) {
    return {
      ok: false,
      error:
        "That's a share link, which Facebook won't show inside E-Gabay. On Facebook, click the post's date or time (like \"1d\") and copy that link, or use ⋯ → Embed and paste the code.",
    };
  }

  // permalink.php needs its query (story_fbid, id); other post URLs don't
  if (url.pathname === "/permalink.php" || url.pathname === "/story.php") {
    const keep = new URLSearchParams();
    for (const k of ["story_fbid", "id"]) {
      const v = url.searchParams.get(k);
      if (v) keep.set(k, v);
    }
    return { ok: true, url: `https://www.facebook.com${url.pathname}?${keep.toString()}` };
  }
  return { ok: true, url: `https://www.facebook.com${url.pathname.replace(/\/$/, "")}` };
}
