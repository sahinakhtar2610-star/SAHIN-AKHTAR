import type { Attachment } from "../types/chat";

const MAX_DIMENSION = 1600;
const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isSupportedImageFile(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }
  return /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export async function processImageFile(file: File): Promise<Attachment> {
  if (!isSupportedImageFile(file)) {
    throw new Error(`Unsupported file "${file.name}". Please upload PNG, JPEG, WEBP, or GIF images.`);
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error(`Image "${file.name}" exceeds the 20 MB limit.`);
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  // Preserve animated GIFs untouched
  if (file.type === "image/gif") {
    return {
      id: createId(),
      name: file.name || "pasted-image.gif",
      mimeType: "image/gif",
      dataUrl: rawDataUrl,
      sizeBytes: file.size,
    };
  }

  try {
    const resized = await optimizeImageDataUrl(rawDataUrl, file.type || "image/png");
    return {
      id: createId(),
      name: file.name || "image.png",
      mimeType: resized.mimeType,
      dataUrl: resized.dataUrl,
      width: resized.width,
      height: resized.height,
      sizeBytes: file.size,
    };
  } catch {
    return {
      id: createId(),
      name: file.name || "image.png",
      mimeType: file.type || "image/png",
      dataUrl: rawDataUrl,
      sizeBytes: file.size,
    };
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function optimizeImageDataUrl(
  dataUrl: string,
  mimeType: string
): Promise<{ dataUrl: string; mimeType: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve({ dataUrl, mimeType, width, height });
        return;
      }

      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ dataUrl, mimeType, width: img.width, height: img.height });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputMime = mimeType === "image/png" ? "image/png" : "image/jpeg";
      const compressed = canvas.toDataURL(outputMime, 0.9);
      resolve({
        dataUrl: compressed,
        mimeType: outputMime,
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error("Could not decode image."));
    img.src = dataUrl;
  });
}

/**
 * Generates a crisp technical architecture diagram on canvas as a real PNG Attachment
 * so users can test SAHIN A AI's multimodal vision capabilities with a single click.
 */
export function createSampleArchitectureDiagram(): Attachment {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Clean slate background
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, 960, 540);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 40; x < 960; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 540);
      ctx.stroke();
    }
    for (let y = 40; y < 540; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(960, y);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("Event-Driven Order Processing Topology", 60, 62);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "400 14px sans-serif";
    ctx.fillText("Latency bottleneck observed between Payment Gateway & Inventory Worker", 60, 88);

    const drawNode = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      subtitle: string,
      accent: string
    ) => {
      ctx.fillStyle = "#1E293B";
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#F8FAFC";
      ctx.font = "600 16px sans-serif";
      ctx.fillText(title, x + 18, y + 36);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "400 13px monospace";
      ctx.fillText(subtitle, x + 18, y + 62);
    };

    const drawArrow = (x1: number, y1: number, x2: number, y2: number, label: string) => {
      ctx.strokeStyle = "#14B8A6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.fillStyle = "#14B8A6";
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
      ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.fillStyle = "#CBD5E1";
        ctx.font = "500 12px monospace";
        ctx.fillText(label, (x1 + x2) / 2 - 28, (y1 + y2) / 2 - 10);
      }
    };

    drawNode(60, 210, 190, 92, "Web & Mobile API", "REST / p95: 42ms", "#38BDF8");
    drawNode(360, 135, 220, 92, "Sync Payment Auth", "Blocking HTTP / 1850ms", "#F59E0B");
    drawNode(360, 295, 220, 92, "Order Event Bus", "Kafka Partition x6", "#14B8A6");
    drawNode(690, 210, 210, 92, "Inventory & Ledger", "Single DB Lock / 640ms", "#F43F5E");

    drawArrow(250, 240, 360, 180, "sync call");
    drawArrow(250, 270, 360, 340, "publish");
    drawArrow(580, 180, 690, 240, "webhook");
    drawArrow(580, 340, 690, 270, "consume");

    ctx.fillStyle = "#64748B";
    ctx.font = "400 12px monospace";
    ctx.fillText("Peak Load: 4,200 req/s  |  Timeout Rate: 3.8%  |  Retry Storm Risk: High", 60, 485);
  }

  return {
    id: createId(),
    name: "architecture-diagram.png",
    mimeType: "image/png",
    dataUrl: canvas.toDataURL("image/png"),
    width: 960,
    height: 540,
  };
}
