import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UpscaleResult {
  success: boolean;
  outputPath: string;
  engineUsed: 'LANCZOS_4K' | 'REAL_ESRGAN_4K';
  renderTimeMs: number;
  error?: string;
  notice?: string;
}

/**
 * Checks if Real-ESRGAN native executable or Python module is available on PATH
 */
export async function isRealEsrganAvailable(): Promise<boolean> {
  try {
    // Check for C++ binary (realesrgan-ncnn-vulkan)
    const { stdout } = await execAsync('which realesrgan-ncnn-vulkan || which realesrgan');
    return Boolean(stdout.trim());
  } catch {
    try {
      // Check for Python module
      const { stdout } = await execAsync('python3 -c "import realesrgan; print(\"OK\")"');
      return stdout.includes('OK');
    } catch {
      return false;
    }
  }
}

/**
 * AI Super-Resolution 4K Video Upscaler (Option 2: Real-ESRGAN / Fallback Option 1: Lanczos 4K)
 */
export async function upscaleVideo4K(
  inputVideoPath: string,
  output4kPath: string,
  audioPath: string,
  preferredEngine: 'LANCZOS_4K' | 'REAL_ESRGAN_4K' = 'LANCZOS_4K'
): Promise<UpscaleResult> {
  const startTime = Date.now();

  // If Real-ESRGAN requested, check availability
  if (preferredEngine === 'REAL_ESRGAN_4K') {
    const hasRealEsrgan = await isRealEsrganAvailable();
    if (hasRealEsrgan) {
      try {
        const tempDir = path.join(path.dirname(output4kPath), `esrgan_temp_${Date.now()}`);
        const inFramesDir = path.join(tempDir, 'in_frames');
        const outFramesDir = path.join(tempDir, 'out_frames');
        fs.mkdirSync(inFramesDir, { recursive: true });
        fs.mkdirSync(outFramesDir, { recursive: true });

        // 1. Extract frames from input video at native 60fps
        await execAsync(`ffmpeg -y -i "${inputVideoPath}" -qscale:v 1 -qmin 1 "${inFramesDir}/frame_%05d.png"`);

        // 2. Run Real-ESRGAN AI Super-Resolution (4x upscale to 3840x2160)
        await execAsync(`realesrgan-ncnn-vulkan -i "${inFramesDir}" -o "${outFramesDir}" -n realesrgan-x4plus -s 4 -f png`);

        // 3. Re-assemble frames + 30s audio track into pristine 4K 60fps master MP4 with YouTube faststart
        await execAsync(
          `ffmpeg -y -framerate 60 -i "${outFramesDir}/frame_%05d.png" -i "${audioPath}" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -b:v 45M -maxrate 60M -bufsize 90M -movflags +faststart -c:a aac -b:a 320k -shortest "${output4kPath}"`
        );

        // Clean temp frames
        fs.rmSync(tempDir, { recursive: true, force: true });

        return {
          success: true,
          outputPath: output4kPath,
          engineUsed: 'REAL_ESRGAN_4K',
          renderTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        console.warn('[REAL_ESRGAN] AI upscale failed, falling back to 4K Lanczos filter:', err.message);
      }
    }
  }

  // High-Fidelity Multi-Pass Lanczos + Adaptive Unsharp Sharpening (Option 1)
  try {
    const filterChain = 'scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd,pad=3840:2160:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.8:5:5:0.4';
    const ffmpegCmd = `ffmpeg -y -i "${inputVideoPath}" -i "${audioPath}" -vf "${filterChain}" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -b:v 45M -maxrate 60M -bufsize 90M -movflags +faststart -c:a aac -b:a 320k -shortest "${output4kPath}"`;
    await execAsync(ffmpegCmd);

    return {
      success: true,
      outputPath: output4kPath,
      engineUsed: 'LANCZOS_4K',
      renderTimeMs: Date.now() - startTime,
      notice: preferredEngine === 'REAL_ESRGAN_4K'
        ? 'Real-ESRGAN AI weights not installed on local host; mastered with High-Fidelity 4K Lanczos + Unsharp.'
        : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      outputPath: '',
      engineUsed: 'LANCZOS_4K',
      renderTimeMs: Date.now() - startTime,
      error: err.message,
    };
  }
}
