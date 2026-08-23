import fs from 'fs';
import { spawnSync } from 'child_process';

function generatePPM(width: number, height: number, slotIndex: number): Buffer {
  const header = `P6\n${width} ${height}\n255\n`;
  const headerBuf = Buffer.from(header, 'ascii');
  const pixelBuf = Buffer.alloc(width * height * 3);

  const colors: Record<number, [number, number, number]> = {
    10: [14, 165, 233], // Cyan
    9: [99, 102, 241],  // Indigo
    8: [139, 92, 246],  // Violet
    7: [168, 85, 247],  // Purple
    6: [217, 70, 239],  // Fuchsia
    5: [236, 72, 153],  // Pink
    4: [244, 63, 94],   // Rose
    3: [239, 68, 68],   // Red
    2: [249, 115, 22],  // Orange
    1: [234, 179, 8],   // Amber
  };

  const [cr, cg, cb] = colors[slotIndex] || [56, 189, 248];

  let offset = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Vignette & gradient effect
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const intensity = Math.max(0.1, 1.0 - dist * 0.7);

      // Border frame
      const isBorder = (x > 80 && x < 1840 && (y === 80 || y === 1000)) || (y > 80 && y < 1000 && (x === 80 || x === 1840));

      if (isBorder) {
        pixelBuf[offset] = 255;
        pixelBuf[offset + 1] = 255;
        pixelBuf[offset + 2] = 255;
      } else {
        pixelBuf[offset] = Math.floor(cr * 0.2 * intensity + 15 * intensity);
        pixelBuf[offset + 1] = Math.floor(cg * 0.2 * intensity + 23 * intensity);
        pixelBuf[offset + 2] = Math.floor(cb * 0.2 * intensity + 42 * intensity);
      }
      offset += 3;
    }
  }

  return Buffer.concat([headerBuf, pixelBuf]);
}

const ppmBuf = generatePPM(1920, 1080, 10);
fs.writeFileSync('output/test.ppm', ppmBuf);

const res = spawnSync('ffmpeg', [
  '-y',
  '-loop', '1',
  '-i', 'output/test.ppm',
  '-t', '4.0',
  '-vf', 'scale=1920:1080,fps=30,format=yuv420p',
  '-c:v', 'libx264',
  '-preset', 'fast',
  'output/test_video.mp4'
]);

console.log('ffmpeg exit code:', res.status, res.stderr?.toString().slice(-200));
