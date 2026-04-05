export async function uploadToCloudinary(file, { folder, onProgress } = {}) {
  // Step 1 — get a short-lived signed upload signature from the server.
  const signRes = await fetch("/api/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });

  if (!signRes.ok) {
    const err = await signRes.json();
    throw new Error(err.error || "Failed to get upload signature");
  }

  const { signature, timestamp, api_key, cloud_name } = await signRes.json();

  // Step 2 — upload via XHR so we get upload progress events.
  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", api_key);
  if (folder) formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        const err = JSON.parse(xhr.responseText);
        reject(new Error(err.error?.message || "Cloudinary upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`);
    xhr.send(formData);
  });
}
