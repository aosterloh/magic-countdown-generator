import { SlotTemporalConfig } from '../types';
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
  config: SlotTemporalConfig
): string[] {
  const bounds = computeTemporalBounds(config.mode, config.targetDurationSeconds);

  const args: string[] = ['-y', '-i', inputPath];

  if (config.mode === 'SPEED_UP') {
    args.push(
      '-vf',
      `setpts=${bounds.ptsFactor}*PTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
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
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p'
    );
  } else if (config.mode === 'TRUNCATE_BACK') {
    args.push(
      '-ss',
      '0.000',
      '-t',
      bounds.duration.toFixed(3),
      '-vf',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p'
    );
  } else {
    // PASSTHROUGH
    args.push(
      '-vf',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p',
      '-t',
      '4.000'
    );
  }

  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-an', outputPath);
  return args;
}

export function generateMasterConcatFFmpegArgs(
  processedSlotPaths: string[], // In chronological order (Slot 10 down to 1)
  audioTrackPath: string,
  totalDuration: number,
  outputMasterPath: string
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
    'medium',
    '-crf',
    '18',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    outputMasterPath
  );

  return args;
}
