function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename: string, content: string, mime = "application/json") {
  triggerDownload(filename, new Blob([content], { type: mime }));
}

export function downloadBlob(filename: string, blob: Blob) {
  triggerDownload(filename, blob);
}
