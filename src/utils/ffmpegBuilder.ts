import { SlotTemporalConfig, VideoQualityMode } from '../types';
import { computeTemporalBounds } from './temporalMath';

export interface SingleSlotFFmpegArgs {
  slotIndex: number;
  inputPath: string;
  outputPath: string;
  commandArgs: string[];
}

export function generateSingleSlotFFmpegArgs(
  slotIndex: number,
  inputPath: string,
  outputPath: string,
  config: SlotTemporalConfig,
  qualityMode: VideoQualityMode = 'FAST_720P'
): string[] {
  const bounds = computeTemporalBounds(config.mode, config.targetDurationSeconds);
  const resolution = qualityMode === 'FULL_4K' ? '3840:2160' : '1280:720';
  const preset = qualityMode === 'FULL_4K' ? 'medium' : 'ultrafast';
  const crf = qualityMode === 'FULL_4K' ? '15' : '24';

  const args: string[] = ['-y', '-i', inputPath];

  if (config.mode === 'SPEED_UP') {
    args.push(
      '-vf',
      `setpts=${bounds.ptsFactor}*PTS,scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`,
      '-t',
      bounds.duration.toFixed(3)
    );
  } else if (config.mode === 'TRUNCATE_FRONT') {
    args.push(
      '-ss',
      bounds.trimStart.toFixed(3),
      '-t',
      bounds.duration.toFixed(3),
      '-vf',
      `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`
    );
  } else if (config.mode === 'TRUNCATE_BACK') {
    args.push(
      '-ss',
      '0.000',
      '-t',
      bounds.duration.toFixed(3),
      '-vf',
      `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`
    );
  } else {
    // PASSTHROUGH
    args.push(
      '-vf',
      `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`,
      '-t',
      '4.000'
    );
  }

  args.push('-c:v', 'libx264', '-preset', preset, '-crf', crf, '-an', outputPath);
  return args;
}

export function generateMasterConcatFFmpegArgs(
  processedSlotPaths: string[], // In chronological order (Slot 10 down to 1)
  audioTrackPath: string,
  totalDuration: number,
  outputMasterPath: string,
  qualityMode: VideoQualityMode = 'FAST_720P'
): string[] {
  const args: string[] = ['-y'];

  // Inputs: All 10 video clips
  for (const path of processedSlotPaths) {
    args.push('-i', path);
  }
  // Input: Audio track
  args.push('-i', audioTrackPath);

  const numClips = processedSlotPaths.length;
  const videoConcatInputs = processedSlotPaths.map((_, i) => `[${i}:v]`).join('');
  const filterComplexParts: string[] = [
    `${videoConcatInputs}concat=n=${numClips}:v=1:a=0[vconcat]`,
  ];

  // Audio handling: DEF-04 resolution
  const audioInputIndex = numClips;
  if (totalDuration >= 30.0) {
    // Pad end with silence to match total video duration
    filterComplexParts.push(
      `[${audioInputIndex}:a]apad=whole_dur=${totalDuration.toFixed(3)}[aout]`
    );
  } else {
    // Trim to total video duration with 0.5s fade out
    const fadeStart = Math.max(0, totalDuration - 0.5);
    filterComplexParts.push(
      `[${audioInputIndex}:a]atrim=0:${totalDuration.toFixed(3)},afade=t=out:st=${fadeStart.toFixed(3)}:d=0.5[aout]`
    );
  }

  const preset = qualityMode === 'FULL_4K' ? 'medium' : 'ultrafast';
  const crf = qualityMode === 'FULL_4K' ? '15' : '23';
  const audioBitrate = qualityMode === 'FULL_4K' ? '320k' : '192k';

  args.push(
    '-filter_complex',
    filterComplexParts.join(';'),
    '-map',
    '[vconcat]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    preset,
    '-crf',
    crf,
    '-c:a',
    'aac',
    '-b:a',
    audioBitrate,
    '-shortest',
    outputMasterPath
  );

  return args;
}
