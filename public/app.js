const form = document.querySelector("#downloadForm");
const input = document.querySelector("#url");
const button = document.querySelector("#fetchButton");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const preview = document.querySelector("#preview");
const downloadButton = document.querySelector("#downloadButton");
const mediaType = document.querySelector("#mediaType");
const previewWrap = document.querySelector(".preview-wrap");

form.addEventListener("submit", async event => {
  event.preventDefault();
  button.disabled = true;
  status.textContent = "Fetching media...";
  result.classList.add("hidden");

  try {
    const response = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.value.trim() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not find media");

    if (data.type === "video") {
      previewWrap.innerHTML = "";
      const video = document.createElement("video");
      video.src = data.mediaUrl;
      video.poster = data.posterUrl || "";
      video.controls = true;
      video.style.maxWidth = "100%";
      video.style.maxHeight = "420px";
      previewWrap.appendChild(video);
    } else {
      previewWrap.innerHTML = "";
      const image = document.createElement("img");
      image.alt = "Pinterest media preview";
      image.src = data.mediaUrl;
      previewWrap.appendChild(image);
    }
    mediaType.textContent = data.type === "video" ? "MP4 video" : "Image";
    downloadButton.href = `/api/download?url=${encodeURIComponent(data.mediaUrl)}`;
    result.classList.remove("hidden");
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
