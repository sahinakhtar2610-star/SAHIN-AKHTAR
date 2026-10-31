/**
 * Watermarking utility for SAHIN A AI generated images.
 * Bakes the official "SAHIN A AI" colorful star logo and brand typography
 * directly into the image canvas so downloads, previews, and exports
 * always retain the app identity.
 */

export interface WatermarkOptions {
  logoUrl?: string;
  appName?: string;
  tagline?: string;
  position?: "bottom-right" | "bottom-left";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = src;
  });
}

/**
 * Helper to draw a rounded rectangle path on Canvas 2D
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Stamps the official SAHIN AI logo and brand name onto an image.
 */
export async function stampAppBrandWatermark(
  rawImageUrl: string,
  options: WatermarkOptions = {}
): Promise<string> {
  const {
    logoUrl = "/logo.png",
    appName = "SAHIN AI",
    tagline = "AI CREATION",
    position = "bottom-right",
  } = options;

  try {
    const [baseImg, logoImg] = await Promise.all([
      loadImage(rawImageUrl),
      loadImage(logoUrl).catch(() => null),
    ]);

    const width = baseImg.naturalWidth || baseImg.width || 1024;
    const height = baseImg.naturalHeight || baseImg.height || 1024;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return rawImageUrl;
    }

    // Draw base synthesized image
    ctx.drawImage(baseImg, 0, 0, width, height);

    // Dynamic scale factor relative to a standard 1024px canvas
    const scale = Math.max(0.7, Math.min(2.2, width / 1024));

    const margin = Math.round(24 * scale);
    const badgeHeight = Math.round(48 * scale);
    const logoSize = Math.round(34 * scale);
    const padX = Math.round(14 * scale);
    const gap = Math.round(10 * scale);
    const borderRadius = Math.round(14 * scale);

    const titleFontSize = Math.round(16 * scale);
    const tagFontSize = Math.round(9 * scale);

    // Measure text
    ctx.font = `700 ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const titleMetrics = ctx.measureText(appName);
    const titleWidth = titleMetrics.width;

    ctx.font = `600 ${tagFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const tagMetrics = ctx.measureText(tagline);
    const tagWidth = tagMetrics.width;

    const textBlockWidth = Math.max(titleWidth, tagWidth);
    const badgeWidth = padX + (logoImg ? logoSize + gap : 0) + textBlockWidth + padX;

    // Position calculation
    let badgeX = width - badgeWidth - margin;
    if (position === "bottom-left") {
      badgeX = margin;
    }
    const badgeY = height - badgeHeight - margin;

    // Draw frosted glass badge container
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 12 * scale;
    ctx.shadowOffsetY = 4 * scale;

    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, borderRadius);
    ctx.fillStyle = "rgba(10, 15, 29, 0.82)";
    ctx.fill();

    // Subtle crisp border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();
    ctx.restore();

    // Draw App Logo
    let currentX = badgeX + padX;
    if (logoImg) {
      const logoY = badgeY + (badgeHeight - logoSize) / 2;
      ctx.drawImage(logoImg, currentX, logoY, logoSize, logoSize);
      currentX += logoSize + gap;
    }

    // Draw App Name
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 4 * scale;
    ctx.fillText(appName, currentX, badgeY + badgeHeight * 0.38);

    // Draw Subtitle / Tagline
    ctx.fillStyle = "rgba(204, 251, 241, 0.9)"; // subtle teal/mint glow
    ctx.font = `700 ${tagFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.letterSpacing = `${0.8 * scale}px`;
    ctx.fillText(tagline, currentX, badgeY + badgeHeight * 0.72);
    ctx.restore();

    // Return watermarked JPEG dataUrl
    return canvas.toDataURL("image/jpeg", 0.95);
  } catch (err) {
    console.warn("Watermarking fallback to original:", err);
    return rawImageUrl;
  }
}
