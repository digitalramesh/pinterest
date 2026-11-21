import { jsonResponse, resolvePinterestUrl } from "../lib/media.mjs";

export default {
  async fetch(request) {
    if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });
    try {
      const body = await request.json();
      const url = typeof body.url === "string" ? body.url.trim() : "";
      if (!url) return jsonResponse(400, { error: "Enter a Pinterest URL" });
      return jsonResponse(200, await resolvePinterestUrl(url));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not resolve this URL";
      return jsonResponse(400, { error: message });
    }
  },
};
