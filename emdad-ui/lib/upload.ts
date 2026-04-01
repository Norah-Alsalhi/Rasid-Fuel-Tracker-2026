//lib/upload.ts
export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  const img = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);

  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      file.type.includes("png") ? "image/png" : "image/jpeg",
      quality
    );
  });
}
