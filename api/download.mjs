import { isAllowedHost, jsonResponse, safeFetch } from "../lib/media.mjs";

export default {
  async fetch(request) {
    if (request.method !== "GET") return jsonResponse(405, { error: "Method not allowed" });
    const rawUrl = new URL(request.url).searchParams.get("url");
    if (!rawUrl) return jsonResponse(400, { error: "Missing media URL" });

    let mediaUrl;
    try {
      mediaUrl = new URL(rawUrl);
    } catch {
      return jsonResponse(400, { error: "Invalid media URL" });
    }
    if (!isAllowedHost(mediaUrl.hostname)) {
      return jsonResponse(400, { error: "Unsupported media host" });
    }

    try {
      const response = await safeFetch(mediaUrl.toString(), { accept: "*/*" });
      if (!response.ok) throw new Error(`Media server returned HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const lowerType = contentType.toLowerCase();
      const extension = lowerType.includes("video") ? "mp4"
        : lowerType.includes("png") ? "png" : "jpg";

      return new Response(response.body, {
        status: 200,
        headers: {
          "content-type": contentType,
          "content-disposition": `attachment; filename="pinterest-download.${extension}"`,
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      return jsonResponse(502, { error: message });
    }
  },
};
