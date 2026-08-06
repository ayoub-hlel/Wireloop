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