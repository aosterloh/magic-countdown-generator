import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'magic-countdown-generator-aosterloh-cs-muc';
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

export interface JobMetadata {
  jobId: string;
  customerName: string;
  creativeTheme: string;
  currentStage: number;
  totalSlots: number;
  readyImagesCount: number;
  readyVideosCount: number;
  hasMasterVideo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredJobState {
  jobId: string;
  customerName: string;
  creativeTheme: string;
  styleModifiers?: string;
  selectedModel?: string;
  selectedVideoQuality?: string;
  currentStage: number;
  slots: any[];
  masterVideoUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Generate random 5-character alphanumeric uppercase code
export function generateRandomCode(length: number = 5): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Sanitize customer name for clean job identifier
export function sanitizeCustomerName(name: string): string {
  const clean = name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return clean || 'Countdown';
}

// Create a new unique Job ID
export function generateJobId(customerName: string): string {
  const prefix = sanitizeCustomerName(customerName);
  const code = generateRandomCode(5);
  return `${prefix}-${code}`;
}

// Save Full Job State to GCS (jobs/{jobId}/state.json)
export async function saveJobStateToGcs(state: StoredJobState): Promise<void> {
  const file = bucket.file(`jobs/${state.jobId}/state.json`);
  const payload = JSON.stringify(state, null, 2);
  await file.save(payload, {
    contentType: 'application/json',
    resumable: false,
  });
}

// Load Full Job State from GCS (jobs/{jobId}/state.json)
export async function loadJobStateFromGcs(jobId: string): Promise<StoredJobState | null> {
  try {
    const file = bucket.file(`jobs/${jobId}/state.json`);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [contents] = await file.download();
    return JSON.parse(contents.toString('utf-8')) as StoredJobState;
  } catch (err: any) {
    console.error(`[GCS_STORAGE] Error loading job ${jobId}:`, err.message);
    return null;
  }
}

// List all jobs in GCS sorted by updatedAt descending
export async function listAllJobsFromGcs(): Promise<JobMetadata[]> {
  try {
    const [files] = await bucket.getFiles({ prefix: 'jobs/' });
    const stateFiles = files.filter((f) => f.name.endsWith('/state.json'));

    const jobs: JobMetadata[] = [];

    await Promise.all(
      stateFiles.map(async (file) => {
        try {
          const [contents] = await file.download();
          const state = JSON.parse(contents.toString('utf-8')) as StoredJobState;
          const slots = state.slots || [];

          jobs.push({
            jobId: state.jobId,
            customerName: state.customerName || 'Untitled',
            creativeTheme: state.creativeTheme || '',
            currentStage: state.currentStage || 1,
            totalSlots: slots.length,
            readyImagesCount: slots.filter((s: any) => Boolean(s.currentImageUri)).length,
            readyVideosCount: slots.filter((s: any) => Boolean(s.rawVideoUri)).length,
            hasMasterVideo: Boolean(state.masterVideoUri),
            createdAt: state.createdAt || new Date().toISOString(),
            updatedAt: state.updatedAt || state.createdAt || new Date().toISOString(),
          });
        } catch (e: any) {
          console.warn(`[GCS_STORAGE] Skipped corrupted state file ${file.name}:`, e.message);
        }
      })
    );

    return jobs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err: any) {
    console.error('[GCS_STORAGE] Error listing jobs from GCS:', err.message);
    return [];
  }
}

// Upload a local asset file to GCS
export async function uploadAssetToGcs(
  jobId: string,
  localFilePath: string,
  subfolder: 'images' | 'videos' | 'master' | 'uploads',
  filename: string
): Promise<string> {
  const destination = `jobs/${jobId}/${subfolder}/${filename}`;
  const file = bucket.file(destination);

  let contentType = 'application/octet-stream';
  if (filename.endsWith('.png')) contentType = 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
  if (filename.endsWith('.mp4')) contentType = 'video/mp4';
  if (filename.endsWith('.mp3')) contentType = 'audio/mpeg';

  await bucket.upload(localFilePath, {
    destination,
    contentType,
    resumable: false,
  });

  return `/api/jobs/${jobId}/assets/${subfolder}/${filename}`;
}

// Stream or download an asset from GCS
export function getAssetFile(
  jobId: string,
  subfolder: string,
  filename: string
) {
  const file = bucket.file(`jobs/${jobId}/${subfolder}/${filename}`);
  return file;
}
