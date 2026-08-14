// ponytail: DOM-level emulator capture → PNG blob.
// All circuit art is inlined via ?raw imports → rasterization is taint-free.
// No capturer on Code/Upload tabs → silently skip.
export async function captureEmulatorThumbnail(): Promise<Blob | null> {
  const svg = document.querySelector('#right_panel svg');
  if (!svg) return null;

  const svgStr = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  });
  if (!loaded) return null;

  const w = 400;
  const h = 300;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // fill background so transparent SVG renders against the card bg
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const { width: sw, height: sh } = (svg as SVGSVGElement).viewBox.baseVal || svg.getBoundingClientRect();
  const scale = Math.min(w / sw, h / sh);
  const sx = (w - sw * scale) / 2;
  const sy = (h - sh * scale) / 2;
  ctx.drawImage(img, sx, sy, sw * scale, sh * scale);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

// ponytail: generate a deterministic preview from workspace XML when the emulator
// SVG isn't available (e.g. saving from Code/Upload tab, or first save).
// Extracts block colors from the workspace and renders them as a mosaic + board label.
export function generateWorkspaceThumbnail(workspaceXml: string, boardType: string = 'uno'): Blob | null {
  const w = 400;
  const h = 300;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient — tinted by board type
  const hue = boardType === 'mega' ? 200 : boardType === 'nano' ? 280 : 140;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${hue} 25% 92%)`);
  bg.addColorStop(1, `hsl(${hue} 20% 82%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Extract fill colors from the workspace XML
  const colorRegex = /fill(?:-color)?="(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})"/g;
  const colors: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = colorRegex.exec(workspaceXml)) !== null) {
    if (colors.length >= 12) break;
    colors.push(match[1]);
  }

  // Render extracted colors as a mosaic grid
  if (colors.length > 0) {
    const cols = Math.min(colors.length, 4);
    const rows = Math.ceil(colors.length / cols);
    const cellW = w / cols;
    const cellH = (h * 0.6) / rows;
    colors.forEach((color, i) => {
      const cx = (i % cols) * cellW;
      const cy = Math.floor(i / cols) * cellH + h * 0.15;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.roundRect(cx + 4, cy + 4, cellW - 8, cellH - 8, 8);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Board label at bottom
  ctx.fillStyle = `hsl(${hue} 40% 35%)`;
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(boardType.toUpperCase(), w - 16, h - 14);

  let result: Blob | null = null;
  canvas.toBlob((blob) => { result = blob; }, 'image/png');
  return result;
}

// ponytail: unified entry point — tries emulator capture first, falls back to
// workspace generation. Always produces a blob so every card gets a preview.
export async function captureOrGenerateThumbnail(workspaceXml: string, boardType: string = 'uno'): Promise<Blob | null> {
  const emulator = await captureEmulatorThumbnail();
  if (emulator) return emulator;
  return generateWorkspaceThumbnail(workspaceXml, boardType);
}