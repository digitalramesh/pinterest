export function isPinterestHost(host) {
  const value = host.toLowerCase();
  return value === "pinterest.com" ||
    value.endsWith(".pinterest.com") ||
    value === "pin.it" ||
    value.endsWith(".pin.it");
}

function isPrivateHost(host) {
  const value = host.toLowerCase();
  return value === "localhost" ||
    value.endsWith(".localhost") ||
    value === "127.0.0.1" ||
    value === "::1" ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    value.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value);
}

export function isAllowedHost(host) {
  if (isPrivateHost(host)) return false;
  const value = host.toLowerCase();
  return isPinterestHost(value) ||
    value === "pinimg.com" ||
    value.endsWith(".pinimg.com");
}

export function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function safeFetch(url, headers = {}) {
  let target = new URL(url);
  for (let count = 0; count < 6; count += 1) {
    if (!["http:", "https:"].includes(target.protocol) || !isAllowedHost(target.hostname)) {
      throw new Error("Unsupported or unsafe URL host");
    }
    const response = await fetch(target, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; PinterestMediaDownloader/1.0)", ...headers },
      redirect: "manual",
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect has no destination");
    target = new URL(location, target);
  }
  throw new Error("Too many redirects");
}

function getMeta(page, name) {
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = page.match(new RegExp(
    `<meta[^>]+(?:property|name)=["']${safeName}["'][^>]+content=["']([^"']+)["']|` +
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${safeName}["']`,
    "i",
  ));
  return decodeHtml(match ? (match[1] || match[2]) : "");
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&#x2F;|&#47;/g, "/")
    .replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
}

export async function resolvePinterestUrl(rawUrl) {
  let pageUrl;
  try {
    pageUrl = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid Pinterest image or video URL");
  }
  if (!["http:", "https:"].includes(pageUrl.protocol)) {
    throw new Error("Enter a valid HTTP or HTTPS Pinterest URL");
  }
  if (pageUrl.hostname === "pinimg.com" || pageUrl.hostname.endsWith(".pinimg.com")) {
    return {
      type: pageUrl.pathname.toLowerCase().endsWith(".mp4") ? "video" : "image",
      mediaUrl: pageUrl.toString(),
      posterUrl: null,
    };
  }
  if (!isPinterestHost(pageUrl.hostname)) throw new Error("Only Pinterest URLs are supported");

  const response = await safeFetch(pageUrl.toString(), {
    accept: "text/html,application/xhtml+xml",
  });
  if (!response.ok) throw new Error(`Pinterest returned HTTP ${response.status}`);
  const html = await response.text();
  const posterUrl = getMeta(html, "og:image") || getMeta(html, "twitter:image") || null;
  const candidates = [
    getMeta(html, "og:video"),
    getMeta(html, "og:video:url"),
    getMeta(html, "og:video:secure_url"),
    ...[...html.matchAll(/https?:\\?\/\\?\/[^"' <]+?\.mp4[^"' <]*/gi)]
      .map(match => decodeHtml(match[0].replace(/\\\//g, "/").replace(/\\/g, ""))),
  ].filter(Boolean);

  const videoUrl = candidates.find(value => /^https?:\/\//i.test(value));
  if (videoUrl) return { type: "video", mediaUrl: videoUrl, posterUrl };
  if (posterUrl) return { type: "image", mediaUrl: posterUrl, posterUrl: null };
  throw new Error("No downloadable image or video was found for this URL");
}
