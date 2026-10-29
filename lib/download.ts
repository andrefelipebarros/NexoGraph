export function downloadFile(name: string, content: string | Blob, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function svgToPng(svg: string, width: number, height: number, background: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');
      if (!context) { URL.revokeObjectURL(url); reject(new Error('canvas indisponível')); return; }
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject(new Error('falha ao gerar PNG')); }, 'image/png');
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('falha ao carregar SVG')); };
    image.src = url;
  });
}

export function svgSize(svg: string): { width: number; height: number } {
  const viewBox = /viewBox="([\d.\-\s]+)"/.exec(svg);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return { width: parts[2], height: parts[3] };
  }
  const w = /\swidth="([\d.]+)"/.exec(svg);
  const h = /\sheight="([\d.]+)"/.exec(svg);
  return { width: w ? Number(w[1]) : 1200, height: h ? Number(h[1]) : 720 };
}
