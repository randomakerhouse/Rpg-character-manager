/**
 * Reads an image file, downscales it to fit within maxSize (preserving aspect ratio) and
 * re-encodes as JPEG, returning a data URL. Keeps character portraits small enough to live
 * comfortably in IndexedDB and a Firestore document (which caps out at 1MB per doc).
 */
export function fileToResizedDataUrl(file: File, maxSize = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / img.width, maxSize / img.height);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process that image."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
