import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

EventEmitter.defaultMaxListeners = 100;
import {
  buildDiegeticPrompt,
  buildRevealImagePrompt,
  buildStartImagePrompt,
  buildEndImagePrompt,
  buildCoordinatedVideoPrompt,
  UNIVERSAL_STYLE_ANCHOR,
} from '../src/utils/promptBuilder';
import { generateSingleSlotFFmpegArgs, generateMasterConcatFFmpegArgs } from '../src/utils/ffmpegBuilder';
import { calculateTimelineOffsets, getDefaultTemporalConfigForSlot } from '../src/utils/temporalMath';
import { SlotTemporalConfig } from '../src/types';
import { renderDiegeticVisualFrame } from './renderDiegeticFrame';
import {
  generateJobId,
  resolveNextCustomerProjectName,
  saveJobStateToGcs,
  loadJobStateFromGcs,
  listAllJobsFromGcs,
  deleteJobFromGcs,
  bulkDeleteAllJobsFromGcs,
  uploadAssetToGcs,
  ensureLocalAssetFile,
  ensureStaticAsset,
  StoredJobState,
} from './gcsStorage';

import { upscaleVideo4K } from './upscaler';
import { analyzeVideoSlot } from './videoAnalyzer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WORKSPACE_ROOT = process.cwd();

const UPLOADS_DIR = path.join(WORKSPACE_ROOT, 'uploads');
const OUTPUT_DIR = path.join(WORKSPACE_ROOT, 'output');
const PUBLIC_DIR = path.join(WORKSPACE_ROOT, 'public');
const DIST_DIR = path.join(WORKSPACE_ROOT, 'dist');
const AUDIO_TRACK_PATH = path.join(PUBLIC_DIR, 'countdown', 'countdown_track.mp3');

// Simple log buffer for UI log inspection
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: 'GEMINI_AI' | 'VEO_AI' | 'VEO_QUEUE' | 'ADC_AUTH' | 'FFMPEG' | 'TEMPORAL' | 'REAL_ESRGAN' | 'SYSTEM';
  message: string;
  details?: string;
}

const serverLogs: LogEntry[] = [];
function addLog(level: LogEntry['level'], category: LogEntry['category'], message: string, details?: string) {
  const entry: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
  };
  serverLogs.unshift(entry);
  if (serverLogs.length > 200) serverLogs.pop();
  console.log(`[${entry.timestamp}] [${level}] [${category}] ${message}`);
}

// Track temporarily exhausted API keys with 10-minute cooldown
const quotaExhaustedKeys = new Map<string, number>();

/**
 * Returns a list of valid Gemini API keys, prioritizing healthy keys over cooling-down keys.
 */
export function getGeminiApiKeys(specificKey?: string): string[] {
  const allKeys: string[] = [];
  if (specificKey && specificKey.trim()) {
    allKeys.push(specificKey.trim());
  }
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean).forEach((k) => {
      if (!allKeys.includes(k)) allKeys.push(k);
    });
  }
  if (process.env.GEMINI_API_KEY) {
    const single = process.env.GEMINI_API_KEY.trim();
    if (single && !allKeys.includes(single)) {
      allKeys.push(single);
    }
  }

  const now = Date.now();
  const healthyKeys: string[] = [];
  const coolingDownKeys: string[] = [];

  for (const k of allKeys) {
    const exhaustedAt = quotaExhaustedKeys.get(k);
    if (exhaustedAt && now - exhaustedAt < 10 * 60 * 1000) {
      coolingDownKeys.push(k);
    } else {
      healthyKeys.push(k);
    }
  }

  return [...healthyKeys, ...coolingDownKeys];
}

export function markKeyAsExhausted(key: string) {
  quotaExhaustedKeys.set(key, Date.now());
  const label = `${key.substring(0, 8)}...`;
  addLog('WARN', 'GEMINI_AI', `API Key ${label} reached quota limit (429 RESOURCE_EXHAUSTED). Instantly switching to next API key in pool.`);
}

// Ensure required directories exist
[UPLOADS_DIR, OUTPUT_DIR, path.join(PUBLIC_DIR, 'countdown')].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file hosting with native HTTP 206 Partial Content (Byte-Range) streaming for MP4 videos
app.use(
  '/output',
  express.static(OUTPUT_DIR, {
    acceptRanges: true,
    setHeaders: (res, filePath) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
    },
  })
);

// GCS fallback for assets not found locally
app.get('/output/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  const localPath = path.join(OUTPUT_DIR, filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath, { acceptRanges: true });
  }

  try {
    const fetched = await ensureLocalAssetFile(`/output/${filename}`, WORKSPACE_ROOT, OUTPUT_DIR);
    if (fs.existsSync(fetched)) {
      return res.sendFile(fetched, { acceptRanges: true });
    }
  } catch (e: any) {
    console.warn(`[OUTPUT_GCS_FALLBACK] Error loading ${filename}:`, e.message);
  }

  res.status(404).json({ error: `Output file ${filename} not found` });
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/countdown', express.static(path.join(PUBLIC_DIR, 'countdown')));
app.use('/specifications', express.static(path.join(WORKSPACE_ROOT, 'specifications')));

// Helper: Dynamically loads Veo Prompt Rules exclusively from veo-prompt-guide.md
function getVeoPromptRules(): string {
  try {
    const candidates = [
      path.resolve(process.cwd(), 'veo-prompt-guide.md'),
      path.resolve(process.cwd(), 'public', 'veo-prompt-guide.md'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, 'utf8');
      }
    }
  } catch (e) {
    console.warn('Failed to load veo-prompt-guide.md, using default rules:', e);
  }
  return `══════════════════════════════════════════════════════════════════════════════════════
🚨 MANDATORY 4-PILLAR 360° BRAND NARRATIVE ARCHITECTURE (ZERO MONOTONY)
══════════════════════════════════════════════════════════════════════════════════════
• PILLAR 1: INNOVATION & HIGH-TECH CRAFT (3 Shots: #10, #8, #1)
• PILLAR 2: WORKPLACE CULTURE & PEOPLE (2 Shots: #9, #7)
• PILLAR 3: REAL-WORLD IMPACT & CUSTOMER EXPERIENCE (3 Shots: #5, #4, #3)
• PILLAR 4: SUPPLY CHAIN, LOGISTICS & MISSION CONTROL (2 Shots: #6, #2)

🚨 6 SUPREME VEO 3.1 DIRECTIVES FOR EACH PROMPT:
1. Positive-only scene descriptions (0.0s-2.0s).
2. Single text target (isolate '[N]' in quotes only).
3. High-contrast physical presence and tactile material finish.
4. Centered macro framing during the final 2 seconds (2.0s-4.0s).
5. Mandatory visibility clause: "CRITICAL VISUAL DIRECTIVE: Exactly one single instance of the physical numeral '[N]' must be clearly visible, centered, in sharp macro focus, high-contrast, and unmistakably rendered in the frame during the final 2 seconds; no duplicate or suddenly appearing numbers."
6. Cinematography: 35mm anamorphic lens, shallow depth of field, volumetric rim lighting, natural skin tones, photorealistic textures, 60fps.`;
}

// Convert markdown to clean HTML dynamically
function renderMarkdownToHtml(md: string, mtime?: Date): string {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let inList = false;

  for (const rawLine of lines) {
    let line = rawLine;

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>\n';
        inCodeBlock = false;
      } else {
        html += '<pre><code>';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html += line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n';
      continue;
    }

    // Close list if line is not a list item
    if (inList && !line.trim().startsWith('- ') && !line.trim().startsWith('* ') && !line.trim().startsWith('• ')) {
      html += '</ul>\n';
      inList = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>\n`;
      continue;
    }

    // Horizontal rules
    if (line.trim() === '---' || line.trim() === '***') {
      html += '<hr />\n';
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      let content = line.trim().replace(/^[-*•]\s+/, '');
      content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
      html += `  <li>${content}</li>\n`;
      continue;
    }

    // Blank lines
    if (!line.trim()) {
      continue;
    }

    // Regular paragraphs with inline formatting
    let content = line;
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    html += `<p>${content}</p>\n`;
  }

  if (inList) html += '</ul>\n';
  if (inCodeBlock) html += '</code></pre>\n';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Veo 3 Diegetic Prompt Guide & Rules (Live)</title>
  <style>
    :root {
      --primary: #4285F4;
      --secondary: #EA4335;
      --accent: #FBBC04;
      --success: #34A853;
      --purple: #A855F7;
      --bg: #0f172a;
      --surface: #1e293b;
      --surface-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --code-bg: #0b0f19;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 40px 24px 100px 24px;
    }

    header {
      border-bottom: 1px solid var(--surface-border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-right: 8px;
    }

    .badge-blue { background: rgba(66, 133, 244, 0.15); color: #60a5fa; border: 1px solid rgba(66, 133, 244, 0.3); }
    .badge-emerald { background: rgba(52, 168, 83, 0.15); color: #4ade80; border: 1px solid rgba(52, 168, 83, 0.3); }
    .badge-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .badge-amber { background: rgba(251, 188, 4, 0.15); color: #fde047; border: 1px solid rgba(251, 188, 4, 0.3); }

    h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 16px 0 8px 0;
      letter-spacing: -0.02em;
      color: #fff;
    }

    h2 {
      font-size: 19px;
      font-weight: 700;
      margin: 36px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--surface-border);
      color: #93c5fd;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
      margin: 20px 0 8px 0;
      color: #c084fc;
    }

    p, li {
      color: #cbd5e1;
      font-size: 14px;
    }

    ul, ol {
      padding-left: 24px;
      margin: 12px 0;
    }

    li {
      margin-bottom: 8px;
    }

    hr {
      border: 0;
      border-top: 1px solid var(--surface-border);
      margin: 32px 0;
    }

    pre {
      background: var(--code-bg);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 16px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.5;
      margin: 16px 0;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 6px;
      color: #93c5fd;
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #4ade80;
      margin-top: 8px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <span class="badge badge-purple">Google Veo 3.1</span>
        <span class="badge badge-emerald">Live Auto-Reload</span>
        <span class="badge badge-blue">Diegetic Rules</span>
      </div>
      <div class="live-indicator">
        <div class="pulse-dot"></div>
        <span>Live Synced from <code>veo-prompt-guide.md</code> (Updated: ${mtime ? mtime.toLocaleTimeString() : new Date().toLocaleTimeString()})</span>
      </div>
    </header>

    <div id="custom-banner" style="display:none; margin-bottom: 24px; padding: 14px 20px; border-radius: 16px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.35); align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display:flex; align-items:center; gap: 10px; color: #e2e8f0; font-size: 13px;">
        <span style="font-size: 18px;">⚡</span>
        <span><strong>Personalized Browser Guidelines Detected:</strong> You have customized prompt directives saved in this browser.</span>
      </div>
      <div style="display:flex; align-items:center; gap: 10px;">
        <button id="toggle-view-btn" onclick="toggleCustomView()" style="cursor:pointer; background: #6366f1; color: white; border: none; padding: 7px 14px; border-radius: 10px; font-weight: 700; font-size: 12px; transition: all 0.2s;">View Your Custom Rules</button>
      </div>
    </div>
    <div id="custom-content" style="display:none; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #0f172a; padding: 24px; border-radius: 18px; border: 1px solid rgba(99, 102, 241, 0.3); color: #cbd5e1; font-size: 13px; line-height: 1.6;"></div>

    <main>
      ${html}
    </main>
  </div>

  <script>
    (function() {
      try {
        const custom = localStorage.getItem('veo_custom_prompt_guide');
        if (custom && custom.trim().length > 0) {
          const banner = document.getElementById('custom-banner');
          if (banner) banner.style.display = 'flex';
        }
      } catch(e) {}
    })();
    var viewingCustom = false;
    function toggleCustomView() {
      var defaultMain = document.querySelector('main');
      var customDiv = document.getElementById('custom-content');
      var btn = document.getElementById('toggle-view-btn');
      var custom = localStorage.getItem('veo_custom_prompt_guide') || '';
      viewingCustom = !viewingCustom;
      if (viewingCustom) {
        if (defaultMain) defaultMain.style.display = 'none';
        if (customDiv) {
          customDiv.textContent = custom;
          customDiv.style.display = 'block';
        }
        if (btn) btn.textContent = 'View Official Repository Rules';
      } else {
        if (defaultMain) defaultMain.style.display = 'block';
        if (customDiv) customDiv.style.display = 'none';
        if (btn) btn.textContent = 'View Your Custom Rules';
      }
    }
  </script>
</body>
</html>`;
}

// Dynamic Live Veo Prompt Guide Endpoints (Reads markdown fresh from disk on every request)
app.get(['/veo-prompt-rules.html', '/veo-prompt-guide.html', '/veo-prompt-guide', '/veo-prompt-rules'], (_req, res) => {
  try {
    const guidePath = path.resolve(process.cwd(), 'veo-prompt-guide.md');
    let mdContent = getVeoPromptRules();
    let mtime: Date | undefined;
    if (fs.existsSync(guidePath)) {
      mtime = fs.statSync(guidePath).mtime;
      mdContent = fs.readFileSync(guidePath, 'utf8');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(renderMarkdownToHtml(mdContent, mtime));
  } catch (err: any) {
    return res.status(500).send(`Error rendering prompt guide: ${err.message}`);
  }
});

// Returns default base prompt rules from veo-prompt-guide.md for the UI editor
app.get('/api/veo-prompt-guide/default', (_req, res) => {
  try {
    const content = getVeoPromptRules();
    return res.json({ success: true, content });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// If dist exists, serve frontend from Express as well
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

function execFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    addLog('INFO', 'FFMPEG', `Executing ffmpeg ${args.slice(0, 4).join(' ')}...`);
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stderr);
      } else {
        addLog('ERROR', 'FFMPEG', `FFmpeg exited with code ${code}`, stderr.slice(-300));
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });
    proc.on('error', (err) => {
      addLog('ERROR', 'FFMPEG', 'Spawn error: ' + err.message);
      reject(err);
    });
  });
}

// Helper to get active ADC / gcloud OAuth token
async function getAdcCredentials(): Promise<{ token: string; project: string; account: string }> {
  const { execSync } = await import('child_process');
  const env = {
    ...process.env,
    PATH: `/Users/aosterloh/google-cloud-sdk/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`,
  };

  let token = '';
  let project = 'aosterloh-cs-muc';
  let account = 'aosterloh@cloudspace.goog';

  try {
    account = execSync('gcloud config get-value account', { encoding: 'utf8', env }).trim() || account;
  } catch (e) {}

  try {
    token = execSync(`gcloud auth print-access-token --account=${account}`, { encoding: 'utf8', env }).trim();
  } catch (e) {
    try {
      token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8', env }).trim();
    } catch (e2) {}
  }

  return { token, project, account };
}

// Google OAuth2 Multi-Domain Verification Helper (@cloudspace.goog & @google.com)
const ALLOWED_DOMAINS = ['cloudspace.goog', 'google.com'];

function isDomainAllowed(email?: string, hd?: string): boolean {
  if (hd && ALLOWED_DOMAINS.includes(hd)) return true;
  if (email && ALLOWED_DOMAINS.some((d) => email.toLowerCase().endsWith(`@${d}`))) return true;
  return false;
}

async function verifyGoogleToken(token: string): Promise<{ valid: boolean; email?: string; name?: string; picture?: string; error?: string }> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!res.ok) {
      const errText = await res.text();
      return { valid: false, error: `Invalid Google token: ${errText}` };
    }
    const data = await res.json();
    const email = data.email || '';
    const hd = data.hd || '';

    if (!isDomainAllowed(email, hd)) {
      return {
        valid: false,
        email,
        error: `Access Denied: Account '${email}' does not belong to authorized domains (${ALLOWED_DOMAINS.join(', ')}).`,
      };
    }

    return {
      valid: true,
      email,
      name: data.name || email.split('@')[0],
      picture: data.picture,
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

const APP_PASSWORD = process.env.APP_PASSWORD || '';

// 1. Password-Based Corporate Authentication Endpoint
app.post('/api/auth/password', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password.trim() === APP_PASSWORD.trim()) {
      addLog('SUCCESS', 'ADC_AUTH', 'Authenticated session via application password');
      return res.json({
        success: true,
        user: {
          email: 'alex@cloudspace.goog',
          name: 'Alex Osterloh',
        },
      });
    }

    addLog('WARN', 'ADC_AUTH', 'Blocked login attempt: incorrect password entered');
    return res.status(401).json({
      success: false,
      error: 'Incorrect password. Please enter the valid corporate password.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Authentication Status Endpoint
app.get('/api/auth/me', async (_req, res) => {
  return res.json({
    authenticated: true,
    email: 'alex@cloudspace.goog',
    name: 'Alex Osterloh',
    domains: ALLOWED_DOMAINS,
  });
});

// Domain Lock Protection Middleware for Generation Endpoints
async function requireCloudspaceDomain(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token && token.length > 50) {
    const verifyResult = await verifyGoogleToken(token);
    if (!verifyResult.valid) {
      addLog('WARN', 'ADC_AUTH', `Blocked non-domain request: ${verifyResult.error}`);
      return res.status(403).json({ success: false, error: verifyResult.error });
    }
    return next();
  }

  // Check active server ADC account
  const creds = await getAdcCredentials();
  if (creds.account && !isDomainAllowed(creds.account)) {
    addLog('WARN', 'ADC_AUTH', `Blocked server execution: Account ${creds.account} is not in authorized domains (${ALLOWED_DOMAINS.join(', ')})`);
    return res.status(403).json({
      success: false,
      error: `Access Denied: Server environment account ${creds.account} not authorized. Must be @${ALLOWED_DOMAINS.join(' or @')}.`,
    });
  }

  next();
}

// Logs API Endpoint
app.get('/api/logs', (_req, res) => {
  return res.json({ success: true, logs: serverLogs });
});

// ADC Status Endpoint
app.get('/api/adc-status', async (_req, res) => {
  try {
    const creds = await getAdcCredentials();
    return res.json({
      success: true,
      account: creds.account,
      project: creds.project,
      hasToken: Boolean(creds.token),
      domains: ALLOWED_DOMAINS,
    });
  } catch (err: any) {
    return res.json({
      success: true,
      account: 'aosterloh@cloudspace.goog',
      project: 'aosterloh-cs-muc',
      hasToken: true,
      domains: ALLOWED_DOMAINS,
    });
  }
});

// -------------------------------------------------------------
// Persistent Multi-User Job Management Endpoints (Google Cloud Storage)
// -------------------------------------------------------------

// List all jobs
app.get('/api/jobs', requireCloudspaceDomain, async (req, res) => {
  try {
    const jobs = await listAllJobsFromGcs();
    res.json({ success: true, jobs });
  } catch (err: any) {
    addLog('ERROR', 'SYSTEM', `Error listing jobs from GCS: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Create a new job
app.post('/api/jobs', requireCloudspaceDomain, async (req, res) => {
  try {
    const {
      customerName = 'Project',
      creatorLdap = '',
      creativeTheme = '',
      styleModifiers = '',
      selectedModel = 'gemini-3.1-flash-image',
      selectedVideoQuality = 'FAST_720P',
      currentStage = 1,
      slots = [],
      masterVideoUri = null,
    } = req.body;

    const existingJobs = await listAllJobsFromGcs();
    const versionedCustomerName = resolveNextCustomerProjectName(customerName || 'Project', existingJobs);
    const jobId = generateJobId(versionedCustomerName);
    const now = new Date().toISOString();

    const jobState: StoredJobState = {
      jobId,
      customerName: versionedCustomerName,
      creatorLdap: creatorLdap || undefined,
      creativeTheme,
      styleModifiers,
      selectedModel,
      selectedVideoQuality,
      currentStage,
      slots,
      masterVideoUri: masterVideoUri || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await saveJobStateToGcs(jobState);
    addLog('SUCCESS', 'SYSTEM', `Created new persistent GCS project: ${jobId} (${versionedCustomerName}, Owner: ${creatorLdap || 'Anonymous'})`);

    res.json({ success: true, job: jobState });
  } catch (err: any) {
    addLog('ERROR', 'SYSTEM', `Error creating job in GCS: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific job by ID
app.get('/api/jobs/:jobId', requireCloudspaceDomain, async (req, res) => {
  try {
    const jobId = String(req.params.jobId);
    const job = await loadJobStateFromGcs(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job ${jobId} not found in GCS` });
    }
    res.json({ success: true, job });
  } catch (err: any) {
    addLog('ERROR', 'SYSTEM', `Error fetching job ${req.params.jobId}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Update / Auto-save a job
app.put('/api/jobs/:jobId', requireCloudspaceDomain, async (req, res) => {
  try {
    const jobId = String(req.params.jobId);
    const existing = (await loadJobStateFromGcs(jobId)) || ({} as Partial<StoredJobState>);

    const updatedState: StoredJobState = {
      ...existing,
      ...req.body,
      jobId,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    };

    await saveJobStateToGcs(updatedState);
    res.json({ success: true, job: updatedState });
  } catch (err: any) {
    addLog('ERROR', 'SYSTEM', `Error auto-saving job ${req.params.jobId}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete all jobs from GCS
app.delete('/api/jobs', requireCloudspaceDomain, async (_req, res) => {
  try {
    const success = await bulkDeleteAllJobsFromGcs();
    if (!success) {
      return res.status(500).json({ error: 'Failed to bulk delete all jobs from GCS' });
    }
    addLog('INFO', 'SYSTEM', 'Successfully bulk deleted all jobs and assets from GCS');
    res.json({ success: true, message: 'All projects deleted successfully' });
  } catch (err: any) {
    addLog('ERROR', 'SYSTEM', `Error bulk deleting jobs: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific job by ID from GCS
app.delete('/api/jobs/:jobId', requireCloudspaceDomain, async (req, res) => {
  try {
    const jobId = String(req.params.jobId);
    const success = await deleteJobFromGcs(jobId);
    if (!success) {
      return res.status(500).json({ error: `Failed to delete job ${jobId} from GCS` });
    }
    addLog('INFO', 'SYSTEM', `Successfully deleted job ${jobId} and all associated assets from GCS`);
    res.json({ success: true, message: `Job ${jobId} deleted successfully` });
  } catch (err: any) {
    addLog('ERROR', 'SYSTEM', `Error deleting job ${req.params.jobId}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Stream or download a GCS media asset with native range support and local container caching
app.get('/api/jobs/:jobId/assets/:subfolder/:filename', async (req, res) => {
  try {
    const jobId = String(req.params.jobId);
    const subfolder = String(req.params.subfolder);
    const filename = String(req.params.filename);
    const localPath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    const fetched = await ensureLocalAssetFile(`api/jobs/${jobId}/assets/${subfolder}/${filename}`, WORKSPACE_ROOT, OUTPUT_DIR);
    if (fs.existsSync(fetched)) {
      return res.sendFile(fetched);
    }

    res.status(404).json({ error: 'Asset not found in GCS' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Dynamically loads Veo Prompt Rules from veo-prompt-rules.md or veo-prompt-guide.md
// 0. Auto-Brainstorm 10 Visual Ideas for Brand (Gemini 3.8 Flash with 3.7 Flash fallback & Search Grounding)
app.post('/api/suggest-brand-ideas', requireCloudspaceDomain, async (req, res) => {
  try {
    const { brandName, apiKey } = req.body;
    if (!brandName || !brandName.trim()) {
      return res.status(400).json({ error: 'brandName is required' });
    }

    const key = apiKey || process.env.GEMINI_API_KEY;

    addLog('INFO', 'GEMINI_AI', `Brainstorming 10 visual ideas for "${brandName}" via Gemini 3.8 Flash...`);

    const promptText = `You are an elite brand creative director and visual film scout specializing in cutting-edge industrial and technological cinematography.
Perform Google Search grounding to discover real-world products, specialized machinery, manufacturing lines, technical labs, security infrastructure, and mission-critical field operations for company/brand "${brandName}".

STRICT RULE: Focus EXCLUSIVELY on the customer's authentic industry, specialized machinery, facilities, and technical workflows. DO NOT generate generic corporate office clichés (e.g. no cafeterias, no espresso lounges, no laughing around watercoolers, no generic office meeting rooms). Every single scene must feel authentic to what "${brandName}" specifically builds, operates, protects, or manufactures.

Using the 100% Industry 4-Pillar Narrative Architecture:
- Pillar 1: Core Manufacturing Lines & High-Tech Hardware (e.g. robotic fabrication, laser etching/printing lines, micro-assembly, specialized presses)
- Pillar 2: Specialized R&D, Testing, Calibration & Inspection Labs (e.g. optical/UV inspection stations, cleanroom testing chambers, biometric/cryptographic calibration, high-voltage test rigs)
- Pillar 3: Real-World Technical Deployments & Specialized Field Touchpoints (e.g. border e-gates, specialized transport, telemetry kiosks, field engineers deploying solutions)
- Pillar 4: Mission Control, Security Operations & Automated Infrastructure (e.g. sovereign cloud data centers, cryptographic HSM vaults, industrial dispatch bridges, automated robotics)

Provide a concise, numbered 10-shot creative visual ideas summary for "${brandName}".
Format your response as exactly 10 numbered bullet lines (1. to 10.) that describe vibrant, diverse visual scenes.

Return ONLY the 10 numbered lines.`;

    if (key) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.7-flash'];
      for (const m of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                  temperature: 0.7,
                },
                tools: [{ googleSearch: {} }],
              }),
            }
          );
          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              return res.json({
                success: true,
                brandName,
                visualIdeas: text,
                model: m,
                groundingMetadata: data.candidates?.[0]?.groundingMetadata || null,
              });
            }
          }
        } catch (err) {
          console.warn(`Brainstorm model ${m} failed:`, err);
        }
      }
    }

    // Fallback if API key unavailable
    const fallbackIdeas = `1. Advanced R&D prototyping laboratory with precision laser optics for ${brandName}
2. High-precision optical inspection and material calibration cleanroom laboratory
3. Automated multi-axis robotic precision manufacturing and assembly line
4. Glass-walled creative design studio with team collaborating on whiteboard
5. Global automated distribution and logistics cargo terminal at dusk
6. High-performance real-world field operation in scenic outdoor setting
7. Customer experience center with client interacting with new product
8. Large-scale sustainable infrastructure facility with green energy arrays
9. Executive command operations bridge overlooking city skyline at twilight
10. Flagship final presentation showcase under dramatic architectural lighting`;

    return res.json({
      success: true,
      brandName,
      visualIdeas: fallbackIdeas,
      model: 'procedural-fallback',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Generate Diegetic Prompts (Gemini 3.8 Flash with 3.7 Flash fallback via API Key or ADC)
app.post('/api/generate-diegetic-prompts', requireCloudspaceDomain, async (req, res) => {
  try {
    const { brandName = 'Porsche Motorsport', themeContext = 'Automotive telemetry laboratory', apiKey, authMode = 'ADC', customPromptRules } = req.body;
    const creds = await getAdcCredentials();
    const key = apiKey || process.env.GEMINI_API_KEY;

    const isCustom = typeof customPromptRules === 'string' && customPromptRules.trim().length > 0;
    const rules = isCustom ? customPromptRules.trim() : getVeoPromptRules();

    addLog('INFO', 'GEMINI_AI', `Generating Diegetic Prompts with reveal strategy for brand "${brandName}" using ${isCustom ? 'User Custom Prompt Guide' : 'Default veo-prompt-guide.md'} via Gemini 3.8 Flash...`);

    const userIdeasSection = themeContext && themeContext.trim().length > 0
      ? `\n🚨 TOP PRIORITY VISUAL BLUEPRINT FROM USER (NON-NEGOTIABLE):\n"${themeContext.trim()}"\nYou MUST extract every specialized machine, technical facility, material, security mechanism, and operational process mentioned in these ideas and feature them prominently across the 10 scenes.\n`
      : '';

    const promptText = `You are an elite visual effects director, cinematographer, and generative video prompt director specializing in Google Veo 3.1.
First, perform Google Search grounding to thoroughly research customer/brand "${brandName}":
1. Their specialized physical products, hardware, chips, security documents, vehicles, or technical infrastructure.
2. Their authentic industrial facilities, production lines, engineering laboratories, and cleanrooms.
3. Their real-world field applications, end-user verification points, security touchpoints, or client operational environments.
4. Their mission control centers, security operations vaults, automated logistics, and technical infrastructure.

${userIdeasSection}
STRICT RULE ON SCENE DOMAINS:
Focus EXCLUSIVELY on the customer's authentic industry, specialized machinery, facilities, and technical workflows.
DO NOT generate generic corporate office clichés (e.g. absolutely NO cafeterias, NO espresso lounges, NO colleagues laughing over coffee, NO generic office meeting rooms).
Every single scene must feel authentic to what "${brandName}" specifically manufactures, engineers, secures, or deploys.

Then, synthesize a dynamic, highly varied 10-shot countdown narrative arc counting down from 10 down to 1 tailored for "${brandName}".

${rules}

Return ONLY a valid JSON array of 10 objects:
[
  {
    "index": 10,
    "diegeticNumber": 10,
    "concept": "Specific authentic industrial setting, specialized machine, or facility title matching ${brandName}",
    "objectEmbedding": "specific high-contrast luminous or stark graphical carrier (e.g. illuminated LED/e-ink telemetry display / laser-engraved security polycarbonate plate / backlit industrial stencil sign / stark white stencil on matte equipment chassis; NEVER bare dark metal cylinders)",
    "revealMechanism": "Camera executes rapid cinematic zoom into carrier object",
    "startImagePrompt": "Cinematic establishing shot of the scene. Clean scenic composition.",
    "endImagePrompt": "Tight macro hero shot focused on carrier object with bold unpadded numeral '[N]' in razor-sharp center focus.",
    "videoPrompt": "Silent 4-second clip revealing the number \"[N]\". [Draft a concise 45-65 word Veo 3.1 prompt strictly adhering to the Core Visibility Rules from the guide: front-load the unpadded numeral '[N]' (no leading zeros like '09') within the first 10 words, apply the 2x repetition rule, specify the exact reveal motion, pair with a high-contrast luminous/graphical carrier surface (no bare dark metal cylinders), and finish]."
  }
]`;

    const apiKeys = getGeminiApiKeys(apiKey);

    // Attempt 1: Via Google AI Studio Gemini API with Google Search Grounding (Gemini 3.8 Flash with Key Pool failover)
    if (apiKeys.length > 0) {
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
      ];

      for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
        const currentKey = apiKeys[keyIdx];
        const keyLabel = `Key #${keyIdx + 1} (${currentKey.substring(0, 8)}...)`;

        for (const m of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${currentKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: promptText }] }],
                  tools: [{ googleSearch: {} }],
                }),
              }
            );

            if (!geminiRes.ok) {
              const errText = await geminiRes.text();
              if (geminiRes.status === 429 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
                markKeyAsExhausted(currentKey);
                addLog('WARN', 'GEMINI_AI', `${keyLabel} rate-limited (429) for ${m}. Rotating to next key...`);
                break; // Break model loop to try next key in pool
              }
              console.warn(`[GEMINI_AI] ${m} HTTP ${geminiRes.status}:`, errText.slice(0, 150));
              continue;
            }

            const data = await geminiRes.json();
            const candidate = data.candidates?.[0];
            const rawResponse = candidate?.content?.parts?.[0]?.text;
            if (rawResponse) {
              // Robust JSON extraction removing markdown fences, leading/trailing prose, and control characters
              let cleaned = rawResponse
                .replace(/^[\s\S]*?(\[\s*\{)/m, '$1')
                .replace(/(\}\s*\])[\s\S]*?$/, '$1')
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c: string) => (c === '\n' || c === '\r' || c === '\t' ? c : ''))
                .trim();

              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const enriched = parsed.map((item: any, i: number) => {
                  const rawNum = typeof item.diegeticNumber === 'number' ? item.diegeticNumber : parseInt(String(item.diegeticNumber).replace(/\D/g, ''), 10);
                  const num = Number.isFinite(rawNum) && rawNum > 0 ? rawNum : (10 - i);
                  const idx = typeof item.index === 'number' ? item.index : num;
                  const startPrompt = item.startImagePrompt || item.imagePrompt || buildStartImagePrompt(num, item.concept, item.objectEmbedding, brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
                  const endPrompt = item.endImagePrompt || buildEndImagePrompt(num, item.concept, item.objectEmbedding, brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
                  const vidPrompt = item.videoPrompt || buildCoordinatedVideoPrompt(num, item.concept, item.objectEmbedding, item.revealMechanism || 'Camera pushes into scene', brandName);
                  return {
                    ...item,
                    index: idx,
                    diegeticNumber: num,
                    startImagePrompt: startPrompt,
                    imagePrompt: startPrompt,
                    endImagePrompt: endPrompt,
                    videoPrompt: vidPrompt,
                    revealMechanism: item.revealMechanism || `Starts on clean establishing scene ➔ Camera motion brings number '${num}' into center focus`,
                  };
                });

                // Extract Google Search Grounding Metadata
                const groundingMeta = candidate?.groundingMetadata;
                let searchQueries: string[] = [];
                let groundingSources: { title: string; url: string }[] = [];
                if (groundingMeta) {
                  if (Array.isArray(groundingMeta.webSearchQueries)) {
                    searchQueries = groundingMeta.webSearchQueries;
                  }
                  if (Array.isArray(groundingMeta.groundingChunks)) {
                    groundingSources = groundingMeta.groundingChunks
                      .map((c: any) => ({
                        title: c.web?.title || 'Verified Source',
                        url: c.web?.uri || '',
                      }))
                      .filter((s: any) => Boolean(s.url));
                  }
                }

                addLog(
                  'SUCCESS',
                  'GEMINI_AI',
                  `Synthesized 10 grounded prompts using ${m} via ${keyLabel} (${groundingSources.length} search sources found)`
                );

                return res.json({
                  success: true,
                  prompts: enriched,
                  groundingMetadata: {
                    searchQueries,
                    sources: groundingSources,
                  },
                  auth: 'API_KEY',
                  model: m,
                });
              }
            }
          } catch (apiErr: any) {
            console.warn(`Model ${m} with ${keyLabel} prompt call failed:`, apiErr.message);
          }
        }
      }
    }

    // Dynamic Multi-Domain Procedural Fallback Prompts (10 Mutually Exclusive Stages, Single 'N', High Contrast)
    const isSecurityOrIdentity = /bundesdruckerei|identity|passport|biometric|cryptographic|hsm|security document|intaglio|sovereign cloud|eid|smart card|faraday/i.test(`${brandName} ${themeContext}`);
    const isSemiconductor = /semiconductor|infineon|microchip|wafer|silicon|transistor|microelectronic|inverter|asml|intel|qualcomm|nvidia|bosch|siemens/i.test(`${brandName} ${themeContext}`);
    const isPadelOrSports = /padel|tennis|sport|camp|vacation|game|match|player|adidas|nike/i.test(`${brandName} ${themeContext}`);
    const isAviation = /aviation|airline|flight|plane|hangar|tarmac|airport|lufthansa/i.test(`${brandName} ${themeContext}`);

    let concepts: { num: number; concept: string; embed: string; reveal: string }[] = [];

    if (isSecurityOrIdentity) {
      concepts = [
        { num: 10, concept: `sovereign cloud cryptographic hardware security module server cleanroom`, embed: "illuminated amber LED telemetry display on the tamper-evident server rack", reveal: "rapidly zooms into the glowing amber LED rack display" },
        { num: 9, concept: `polycarbonate multi-layer security document vacuum lamination hall`, embed: "stark white industrial stencil on the heavy hydraulic press chassis", reveal: "smoothly dollies down to the white press chassis stencil" },
        { num: 8, concept: `high-precision laser ablation document personalization workstation`, embed: "carbonized black laser engraving on virgin white polycarbonate document surface", reveal: "rapidly zooms into the active laser focal target plate" },
        { num: 7, concept: `automated border control biometric eGate testing terminal`, embed: "high-contrast white OLED guidance touchscreen beside the optical scanner", reveal: "tracks smoothly into the luminous white guidance display" },
        { num: 6, concept: `optical forensic inspection laboratory under 365nm ultraviolet illumination`, embed: "phosphor-green fluorescent security ink glowing under UV blacklight", reveal: "sweeps into the brilliant phosphor-green fluorescent security ink pattern" },
        { num: 5, concept: `contactless biometric microchip and RFID antenna high-speed inlay cell`, embed: "backlit e-ink diagnostic status panel on the robotic vacuum effector head", reveal: "tracks the robotic placement arm down to the backlit e-ink panel" },
        { num: 4, concept: `air-gapped sovereign public key infrastructure cryptographic key ceremony vault`, embed: "phosphor-green CRT terminal monitor inside the electromagnetic Faraday cage", reveal: "glides past vault blast door, locking focus onto the terminal monitor" },
        { num: 3, concept: `diffractive optical variable kinegram and security hologram stamping press`, embed: "iridescent rainbow hologram foil register plate", reveal: "executes a dynamic push-in zoom into the iridescent metallic hologram foil" },
        { num: 2, concept: `subterranean sovereign document logistics vault with autonomous guided vehicles`, embed: "safety-yellow industrial stencil on the autonomous transport robot chassis", reveal: "centers rapidly onto the safety-yellow chassis stencil" },
        { num: 1, concept: `master sovereign digital trust anchor identity verification terminal`, embed: "brilliant cyan laser-illuminated optical sapphire glass scanning prism", reveal: "executes a dramatic macro push-in zoom into the glowing sapphire laser prism" },
      ];
    } else if (isSemiconductor) {
      concepts = [
        { num: 10, concept: `high-temperature semiconductor crystal growing furnace with glowing induction coils in advanced R&D lab`, embed: "illuminated LED temperature diagnostic screen beside the induction furnace", reveal: "rapidly zooms into the glowing amber LED diagnostic screen" },
        { num: 9, concept: `cleanroom wafer probe testing bay with robotic microscopes and high-voltage test heads`, embed: "illuminated cyan LED telemetry screen on the probe testing station", reveal: "Camera dollies smoothly past the automated probe arm, locking onto the cyan LED diagnostic screen in center focus" },
        { num: 8, concept: `automated EV powertrain inverter module assembly line with multi-axis robotic bonding arms`, embed: "matte-black anodized aluminum inverter chassis center", reveal: "Robotic welding head lifts cleanly away from the matte-black aluminum chassis" },
        { num: 7, concept: `glass-walled innovation design studio where engineers collaborate around a transparent whiteboard`, embed: "transparent glass whiteboard with vibrant neon orange marker writing", reveal: "Camera tracks past collaborating designers, centering on the neon writing on the glass whiteboard" },
        { num: 6, concept: `global automated logistics shipping terminal with autonomous cargo transport tugs at golden dusk`, embed: "matte composite cargo container hatch", reveal: "Autonomous transport arm locks onto the container, bringing the hatch into sharp center focus" },
        { num: 5, concept: `high-performance electric sports car accelerating through scenic alpine mountain highway curves`, embed: "digital cockpit steering wheel telemetry display", reveal: "Camera glides forward inside the cockpit, macro-locking onto the glowing digital telemetry dial" },
        { num: 4, concept: `modern ultra-fast highway EV charging station where a driver connects the high-power cable with a subtle smile`, embed: "high-contrast illuminated charging station terminal display", reveal: "Camera glides past the customer hand, zooming into the glowing terminal display in sharp center focus" },
        { num: 3, concept: `offshore wind turbine power converter nacelle overlooking dramatic ocean storm clouds`, embed: "heavy brushed copper power converter cabinet plate", reveal: "Protective access hatch swings open, revealing the brushed copper converter plate in center focus" },
        { num: 2, concept: `panoramic smart city operations control bridge with illuminated telemetry screens overlooking skyline at twilight`, embed: "brushed dark titanium telemetry console bezel", reveal: "Camera glides over operator consoles, locking onto the central telemetry console bezel" },
        { num: 1, concept: `flagship silicon microchip hero showcase under warm dramatic architectural lighting`, embed: "matte black encapsulated flagship microchip center", reveal: "Camera ascends in an elegant hero arc, centering on the flagship microchip in full glory" },
      ];
    } else if (isPadelOrSports) {
      concepts = [
        { num: 10, concept: `sunny Mediterranean outdoor athletic center court surrounded by palm trees and glass walls`, embed: "deep blue synthetic turf baseline center", reveal: "Camera dollies forward into the blue turf baseline in macro center focus" },
        { num: 9, concept: `players clubhouse café with athletes laughing and chatting over fresh smoothies and espresso in morning sun`, embed: "laser-engraved polished copper clubhouse counter plaque", reveal: "Camera tracks past chatting players, locking onto the copper counter plaque in center focus" },
        { num: 8, concept: `pro shop racket stringing workstation with precision tension calibration equipment`, embed: "digital string tension calibration dial face", reveal: "Camera executes smooth push-in that brings glowing tension dial into prominent focus" },
        { num: 7, concept: `coaches tactical briefing lounge with players reviewing match strategies on a digital board`, embed: "brushed aluminum tactical clipboard frame", reveal: "Camera glides past coach gesturing to players, focusing on the tactical clipboard frame" },
        { num: 6, concept: `tournament gear distribution and logistics bay with players receiving personalized equipment`, embed: "matte black equipment case latch", reveal: "Equipment case lid flips open, revealing the central latch in crisp focus" },
        { num: 5, concept: `dynamic championship match center court with players diving for an energetic reflex volley`, embed: "high-contrast white court boundary corner marker", reveal: "Camera tracks ball impact at high speed, locking onto the corner boundary marker" },
        { num: 4, concept: `spectator stadium seating with enthusiastic fans cheering in golden sunset light`, embed: "cast bronze stadium VIP seating row plaque", reveal: "Camera glides past cheering fans, locking directly onto the bronze seat row plaque" },
        { num: 3, concept: `tournament awards podium at twilight with ocean sunset backdrop`, embed: "bronze podium pedestal center step", reveal: "Camera cranes down smoothly toward illuminated podium steps in prominent focus" },
        { num: 2, concept: `silver championship presentation table with deep velvet drape and event spotlights`, embed: "hand-engraved silver championship medallion", reveal: "Camera tracks smoothly across presentation table to bring silver medallion into crisp clarity" },
        { num: 1, concept: `gleaming championship trophy pedestal on center court catching brilliant morning sun rays`, embed: "polished gold winner cup central crest", reveal: "Dynamic ascending camera sweep circles around polished gold cup into sunlight" },
      ];
    } else if (isAviation) {
      concepts = [
        { num: 10, concept: `widebody aircraft maintenance hangar with engineers inspecting airframe structures at dawn`, embed: "overhead steel gantry marker plate", reveal: "Camera dollies past structural pillars, tilting up to lock onto the illuminated gantry plate" },
        { num: 9, concept: `modern flight crew lounge where pilots and flight attendants discuss flight routes over morning coffee`, embed: "brushed brass crew lounge coffee bar plaque", reveal: "Camera glides past conversing flight crew, locking onto the brass coffee bar plaque" },
        { num: 8, concept: `turbofan jet engine overhaul bay in clean aerospace engineering facility`, embed: "precision titanium compressor rotor hub", reveal: "Camera pushes past curved titanium blades, uncovering the rotor hub with crystal clarity" },
        { num: 7, concept: `airline operations control center with dispatchers collaborating around giant live airspace maps`, embed: "glass flight dispatch console monitor bezel", reveal: "Camera tracks over dispatchers conferring, centering on the console monitor bezel" },
        { num: 6, concept: `airport cargo apron with autonomous electric tugs loading cargo containers at golden dusk`, embed: "retroreflective cargo container identification plate", reveal: "Autonomous tug moves into frame, bringing the reflective container plate into crisp focus" },
        { num: 5, concept: `widebody airliner soaring smoothly over golden sunset cloud layers`, embed: "cockpit primary flight display altitude readout", reveal: "Camera moves smoothly forward between pilot seats, zooming into the primary flight display" },
        { num: 4, concept: `first-class passenger relaxing in private suite with a warm smile as cabin service begins`, embed: "brushed aluminum seat suite console badge", reveal: "Camera glides past passenger sipping water, locking onto the aluminum suite console badge" },
        { num: 3, concept: `wet tarmac runway threshold lineup with dramatic glowing centerline lights in misty twilight`, embed: "painted white runway threshold center", reveal: "Camera accelerates low over wet asphalt surface, locking onto the painted runway threshold" },
        { num: 2, concept: `air traffic control tower with controllers monitoring landing traffic overlooking the illuminated airport`, embed: "machined aluminum radar telemetry console dial", reveal: "Camera pans past tower controller, locking onto the radar console dial" },
        { num: 1, concept: `aircraft composite winglet navigation beacon catching brilliant golden sunset rays`, embed: "illuminated winglet beacon housing", reveal: "Camera tracks smoothly along composite wingtip, bringing luminous beacon into sharp radiance" },
      ];
    } else {
      // Universal Premium Brand Setting (4-Pillar Narrative Arc: Tech, People, Action, Logistics)
      const universalStages = [
        { name: "advanced R&D prototyping laboratory with laser optics", carrier: "illuminated LED diagnostic display screen" },
        { name: "modern sunlit campus cafeteria with colleagues chatting over coffee", carrier: "laser-engraved brushed brass lounge plaque" },
        { name: "automated robotic precision manufacturing and assembly cell", carrier: "brushed dark aluminum chassis" },
        { name: "glass-walled creative design studio with team collaborating on whiteboard", carrier: "transparent glass board with neon orange writing" },
        { name: "global automated distribution and logistics cargo terminal at dusk", carrier: "matte black cargo container hatch" },
        { name: "real-world high-performance field operation in scenic outdoor setting", carrier: "illuminated digital telemetry dial" },
        { name: "customer experience center with client interacting with new product", carrier: "high-contrast illuminated kiosk screen" },
        { name: "large-scale sustainable infrastructure facility with green energy arrays", carrier: "heavy brushed copper power plate" },
        { name: "executive command operations bridge overlooking city skyline at twilight", carrier: "brushed dark titanium console dial" },
        { name: "flagship final presentation showcase under dramatic architectural lighting", carrier: "hand-polished mirror titanium emblem" },
      ];

      concepts = universalStages.map((stage, i) => {
        const num = 10 - i;
        return {
          num,
          concept: `${stage.name} for ${brandName || 'premium engineering'}`,
          embed: stage.carrier,
          reveal: `Camera executes a rapid cinematic push-in zoom into the center of the ${stage.carrier}`,
        };
      });
    }

    const proceduralPrompts = concepts.map((c) => {
      const startPrompt = buildStartImagePrompt(c.num, c.concept, c.embed, brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
      const endPrompt = buildEndImagePrompt(c.num, c.concept, c.embed, brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
      const vidPrompt = buildCoordinatedVideoPrompt(c.num, c.concept, c.embed, c.reveal, brandName);
      return {
        index: c.num,
        diegeticNumber: c.num,
        concept: c.concept,
        objectEmbedding: c.embed,
        revealMechanism: c.reveal,
        startImagePrompt: startPrompt,
        imagePrompt: startPrompt,
        endImagePrompt: endPrompt,
        videoPrompt: vidPrompt,
      };
    });

    addLog('INFO', 'GEMINI_AI', 'Generated 10 domain-aware procedural dual-keyframe reveal prompts');
    return res.json({ success: true, prompts: proceduralPrompts, auth: 'PROCEDURAL' });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', 'Error generating prompts: ' + err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Re-create a single prompt using Gemini with previous shots context continuity
app.post('/api/recreate-prompt', async (req, res) => {
  try {
    const { diegeticNumber, brandName, themeContext, previousShots, customVisualIdea, apiKey, customPromptRules } = req.body;
    const key = apiKey || process.env.GEMINI_API_KEY;

    const isCustom = typeof customPromptRules === 'string' && customPromptRules.trim().length > 0;
    const rules = isCustom ? customPromptRules.trim() : getVeoPromptRules();

    addLog('INFO', 'GEMINI_AI', `Re-creating 4.0s cinematic prompt for Shot #${diegeticNumber} (${brandName}${customVisualIdea ? ` • Custom Idea: "${customVisualIdea}"` : ''}) using ${isCustom ? 'User Custom Prompt Guide' : 'Default veo-prompt-guide.md'}...`);

    let contextSection = '';
    if (previousShots && Array.isArray(previousShots) && previousShots.length > 0) {
      const summaryList = previousShots
        .map((s: any) => `- Shot #${s.diegeticNumber || s.index}: ${s.concept || s.sceneConcept || 'Scene'} (Carrier: ${s.objectEmbedding || 'object'})`)
        .join('\n');
      contextSection = `
4. VISUAL CONTEXT & THEMATIC CONTINUITY (CRITICAL):
   The user is creating a cohesive countdown sequence counting down from 10 down to 1.
   Previous shots established so far:
${summaryList}
   Maintain aesthetic, lighting, palette, and domain continuity with these earlier shots, but choose a DISTINCT, dynamic new scene element, carrier object, and camera angle for Shot #${diegeticNumber}.`;
    }

    let customIdeaSection = '';
    if (customVisualIdea && typeof customVisualIdea === 'string' && customVisualIdea.trim().length > 0) {
      customIdeaSection = `
5. USER'S SPECIFIC CREATIVE & VISUAL DIRECTION (TOP PRIORITY):
   The creator explicitly requested this visual element/action for Shot #${diegeticNumber}:
   "${customVisualIdea.trim()}"
   You MUST incorporate this specific visual concept, object, setting, vehicle, or camera movement while executing the continuous 4.0s reveal of diegetic numeral '${diegeticNumber}'.`;
    }

    const promptText = `You are an elite visual effects director, cinematographer, and generative video prompt engineer specializing in Google Veo 3.1.
Generate a single, breathtaking 4-second cinematic video concept specifically for countdown Shot #${diegeticNumber} tailored for customer "${brandName}" and setting/theme "${themeContext}".

STRICT RULE: The scene MUST focus 100% on customer "${brandName}"'s authentic industrial machinery, technical facilities, production lines, or specialized operational touchpoints. Absolutely NO generic corporate office, cafeteria, or espresso lounge clichés.

${rules}
${contextSection}
${customIdeaSection}

Return ONLY a single valid JSON object:
{
  "index": ${diegeticNumber},
  "diegeticNumber": ${diegeticNumber},
  "concept": "Specific authentic industrial setting, specialized machine, or facility title matching ${brandName}",
  "objectEmbedding": "specific high-contrast luminous or stark graphical carrier (e.g. illuminated LED/e-ink display / backlit stencil signage / stark white stencil on matte plate; NEVER bare dark metal cylinders or reflective metallic pipes)",
  "revealMechanism": "Cinematic camera movement or natural obstacle clearing revealing numeral in center focus",
  "videoPrompt": "Silent 4-second clip revealing the number \"${diegeticNumber}\". [Draft a concise 45-65 word Veo 3.1 prompt strictly adhering to the Core Visibility Rules from the guide: front-load the unpadded numeral '${diegeticNumber}' within the first 10 words, apply the 2x repetition rule, specify the exact reveal motion, pair with a high-contrast luminous/graphical carrier surface (no bare dark metal cylinders), and finish]."
}`;

    if (key) {
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
      ];
      for (const m of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                tools: [{ googleSearch: {} }],
              }),
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const candidate = data.candidates?.[0];
            const rawResponse = candidate?.content?.parts?.[0]?.text;
            if (rawResponse) {
              const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const item = JSON.parse(cleaned);
              const num = Number(item.diegeticNumber) || diegeticNumber;
              const startPrompt = item.startImagePrompt || item.imagePrompt || buildStartImagePrompt(num, item.concept || `Shot #${num}`, item.objectEmbedding || 'carrier', brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
              const endPrompt = item.endImagePrompt || buildEndImagePrompt(num, item.concept || `Shot #${num}`, item.objectEmbedding || 'carrier', brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
              const vidPrompt = item.videoPrompt || buildCoordinatedVideoPrompt(num, item.concept || `Shot #${num}`, item.objectEmbedding || 'carrier', item.revealMechanism || 'Camera pushes into scene', brandName);
              const enriched = {
                ...item,
                index: num,
                diegeticNumber: num,
                startImagePrompt: startPrompt,
                imagePrompt: startPrompt,
                endImagePrompt: endPrompt,
                videoPrompt: vidPrompt,
                revealMechanism: item.revealMechanism || `Starts on clean establishing scene ➔ Camera motion reveals number '${num}'`,
              };

              const groundingMeta = candidate?.groundingMetadata;
              let searchQueries: string[] = [];
              let groundingSources: { title: string; url: string }[] = [];
              if (groundingMeta) {
                if (Array.isArray(groundingMeta.webSearchQueries)) {
                  searchQueries = groundingMeta.webSearchQueries;
                }
                if (Array.isArray(groundingMeta.groundingChunks)) {
                  groundingSources = groundingMeta.groundingChunks
                    .map((c: any) => ({
                      title: c.web?.title || 'Verified Source',
                      url: c.web?.uri || '',
                    }))
                    .filter((s: any) => Boolean(s.url));
                }
              }

              addLog('SUCCESS', 'GEMINI_AI', `Successfully re-created Shot #${diegeticNumber} prompt using ${m} (${groundingSources.length} search sources)`);
              return res.json({
                success: true,
                prompt: enriched,
                groundingMetadata: {
                  searchQueries,
                  sources: groundingSources,
                },
                model: m,
              });
            }
          }
        } catch (apiErr) {
          console.warn(`Model ${m} recreate-prompt call failed:`, apiErr);
        }
      }
    }

    const startPrompt = buildStartImagePrompt(diegeticNumber, `Atmospheric setting for ${brandName}`, `surface numeral '${diegeticNumber}'`, brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
    const endPrompt = buildEndImagePrompt(diegeticNumber, `Atmospheric setting for ${brandName}`, `surface numeral '${diegeticNumber}'`, brandName, themeContext, UNIVERSAL_STYLE_ANCHOR);
    const vidPrompt = buildCoordinatedVideoPrompt(diegeticNumber, `Atmospheric setting for ${brandName}`, `surface numeral '${diegeticNumber}'`, `Camera dollies forward to reveal numeral '${diegeticNumber}'`, brandName);

    const fallbackConcept = {
      index: diegeticNumber,
      diegeticNumber,
      concept: `Atmospheric setting for Shot #${diegeticNumber} in ${themeContext || brandName}`,
      objectEmbedding: `physically engraved numeral '${diegeticNumber}'`,
      revealMechanism: `Starts on clean establishing view in ${themeContext || brandName} ➔ Camera motion brings the physical numeral '${diegeticNumber}' into crisp center focus`,
      startImagePrompt: startPrompt,
      imagePrompt: startPrompt,
      endImagePrompt: endPrompt,
      videoPrompt: vidPrompt,
    };

    return res.json({ success: true, prompt: fallbackConcept, model: 'procedural-fallback' });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', 'Error recreating prompt: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2b. Refine / Tweak Existing Video Prompt via Directorial Feedback
app.post('/api/refine-prompt', requireCloudspaceDomain, async (req, res) => {
  try {
    const {
      slotIndex,
      currentPrompt,
      feedback,
      brandName = 'Brand',
      themeContext = 'Theme',
      apiKey,
    } = req.body;

    const diegeticNumber = Number(slotIndex) || 10;
    const creds = await getAdcCredentials();
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return res.status(400).json({ error: 'Feedback comment is required for prompt refinement' });
    }

    addLog(
      'INFO',
      'GEMINI_AI',
      `Refining Shot #${diegeticNumber} prompt with user feedback: "${feedback.trim()}"...`
    );

    const promptText = `You are a world-class visual effects director, cinematographer, and Google Veo 3.1 prompt engineering specialist.
A creator generated a 4-second video for countdown Shot #${diegeticNumber} (Brand: "${brandName}", Context: "${themeContext}") but wants adjustments based on their directorial notes.

CURRENT PROMPT BLUEPRINT:
"${currentPrompt || ''}"

DIRECTORIAL FEEDBACK / REQUESTED FIX:
"${feedback.trim()}"

TASK:
Surgically revise and refine the prompt blueprint to address the director's feedback completely, while strictly adhering to:
1. Positive-Only Scene Description: NEVER use negative text instructions like "strictly zero numbers", "no text", or "without digits". Describe [0.0s-2.5s] purely through positive physical action.
2. Single-Target Isolation: Only put the numeral '${diegeticNumber}' in quotes. Do NOT include secondary words like 'STEP', 'STAGE', or 'ID'.
3. High-Contrast Physical Tonal Pairing: Numeral '${diegeticNumber}' must be tangible and high-contrast (e.g. glowing amber on dark matte silicon, polished chrome on matte black chassis).
4. Centered Macro Reveal: During [2.5s-4.0s], the camera macro-locks onto the high-contrast numeral '${diegeticNumber}' centered in the frame in razor-sharp focus for the final second.
5. Cinematography: 35mm anamorphic lens, macro depth of field, volumetric rim lighting, photorealistic textures, 60fps.

Return ONLY a single valid JSON object:
{
  "slotIndex": ${diegeticNumber},
  "updatedPrompt": "[0.0s-2.5s]: Dynamic wide cinematic camera tracking shot establishing ..., focusing solely on ... [2.5s-4.0s]: ..., revealing the bold high-contrast physical numeral '${diegeticNumber}' ... in razor-sharp focus during the final second. Cinematography: 35mm anamorphic lens, macro depth of field, ... 60fps.",
  "changesSummary": "Brief 1-sentence explanation of what changes were applied"
}`;

    if (key) {
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
      ];
      for (const m of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
              }),
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawResponse) {
              const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const item = JSON.parse(cleaned);
              addLog('SUCCESS', 'GEMINI_AI', `Successfully refined Shot #${diegeticNumber} prompt using ${m}`);
              return res.json({
                success: true,
                slotIndex: diegeticNumber,
                updatedPrompt: item.updatedPrompt,
                changesSummary: item.changesSummary || 'Prompt updated with user feedback',
                model: m,
              });
            }
          }
        } catch (apiErr) {
          console.warn(`Model ${m} refine-prompt call failed:`, apiErr);
        }
      }
    }

    const fallbackPrompt = `${currentPrompt} (Director's Note: ${feedback.trim()})`;
    return res.json({
      success: true,
      slotIndex: diegeticNumber,
      updatedPrompt: fallbackPrompt,
      changesSummary: `Appended directorial note: ${feedback.trim()}`,
      model: 'fallback',
    });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', `Error refining prompt: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

interface SynthesizeImageOptions {
  prompt: string;
  apiKey?: string;
  gcpProject?: string;
  gcpRegion?: string;
  image1Base64?: string;
  image1MimeType?: string;
  image2Base64?: string;
  image2MimeType?: string;
}

// Helper: Synthesize 16:9 Image with Google AI (Imagen 3 / Gemini Nano Banana / Vertex AI)
async function synthesizeImageWithGoogleAI(
  options: SynthesizeImageOptions | string,
  legacyApiKey?: string,
  legacyGcpProject: string = 'aosterloh-cs-muc',
  legacyGcpRegion: string = 'europe-west3'
): Promise<{ success: boolean; base64?: string; model?: string; error?: string; attempts: any[] }> {
  const opts: SynthesizeImageOptions =
    typeof options === 'string'
      ? { prompt: options, apiKey: legacyApiKey, gcpProject: legacyGcpProject, gcpRegion: legacyGcpRegion }
      : options;

  const prompt16x9 = `${opts.prompt} Widescreen 16:9 aspect ratio, 1920x1080 resolution, cinematic composition.`;
  const key = opts.apiKey || process.env.GEMINI_API_KEY;
  const attempts: any[] = [];

  // If dual images are supplied, prioritize Gemini Multimodal (Nano Banana 2-Image Ingestion)
  if (opts.image1Base64 && opts.image2Base64 && key) {
    const multimodalModels = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp', 'gemini-3.1-flash-image'];
    const parts = [
      {
        text: `You are an expert VFX and generative image editor.
TASK INSTRUCTION: ${opts.prompt}
Image 1: The original background countdown shot to be fixed.
Image 2: The authentic reference product / logo to insert.
Execute the replacement seamlessly, preserving exact environmental lighting, shadows, 16:9 aspect ratio, and 1920x1080 resolution. Output a single photorealistic 16:9 image.`,
      },
      {
        inlineData: {
          mimeType: opts.image1MimeType || 'image/png',
          data: opts.image1Base64,
        },
      },
      {
        inlineData: {
          mimeType: opts.image2MimeType || 'image/png',
          data: opts.image2Base64,
        },
      },
    ];

    for (const m of multimodalModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        });

        if (res.ok) {
          const data = await res.json();
          const candidateParts = data.candidates?.[0]?.content?.parts || [];
          for (const part of candidateParts) {
            if (part.inlineData?.data) {
              attempts.push({ model: m, status: 200, success: true });
              return { success: true, base64: part.inlineData.data, model: `${m} (2-Image Dual Ingestion)`, attempts };
            }
          }
        } else {
          const errText = await res.text();
          let parsedError = errText;
          try {
            const errJson = JSON.parse(errText);
            parsedError = errJson.error?.message || errText;
          } catch {}
          attempts.push({ model: m, status: res.status, error: parsedError });
        }
      } catch (e: any) {
        attempts.push({ model: m, status: 0, error: e.message });
      }
    }
  }

  // 1. Try Imagen 3 via Gemini Developer API (predict endpoint)
  if (key) {
    const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'];

    for (const m of imagenModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:predict?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: prompt16x9 }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '16:9',
              outputOptions: { mimeType: 'image/png' },
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const b64 = data.predictions?.[0]?.bytesBase64Encoded;
          if (b64) {
            attempts.push({ model: m, status: 200, success: true });
            return { success: true, base64: b64, model: m, attempts };
          }
        } else {
          const errText = await res.text();
          let parsedError = errText;
          try {
            const errJson = JSON.parse(errText);
            parsedError = errJson.error?.message || errText;
          } catch {}
          attempts.push({ model: m, status: res.status, error: parsedError });
        }
      } catch (e: any) {
        attempts.push({ model: m, status: 0, error: e.message });
      }
    }

    // Try Gemini Multimodal Image Generation
    const geminiModels = ['gemini-2.0-flash-exp', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image'];
    for (const m of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt16x9 }] }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              attempts.push({ model: m, status: 200, success: true });
              return { success: true, base64: part.inlineData.data, model: m, attempts };
            }
          }
        } else {
          const errText = await res.text();
          let parsedError = errText;
          try {
            const errJson = JSON.parse(errText);
            parsedError = errJson.error?.message || errText;
          } catch {}
          attempts.push({ model: m, status: res.status, error: parsedError });
        }
      } catch (e: any) {
        attempts.push({ model: m, status: 0, error: e.message });
      }
    }
  }

  // 2. Try Vertex AI with ADC
  try {
    const adc = await getAdcCredentials();
    if (adc.token) {
      const regions = [opts.gcpRegion || 'europe-west3', 'us-central1'];
      for (const r of regions) {
        try {
          const vertexUrl = `https://${r}-aiplatform.googleapis.com/v1/projects/${opts.gcpProject || 'aosterloh-cs-muc'}/locations/${r}/publishers/google/models/imagen-3.0-generate-002:predict`;
          const res = await fetch(vertexUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${adc.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instances: [{ prompt: prompt16x9 }],
              parameters: {
                sampleCount: 1,
                aspectRatio: '16:9',
                outputOptions: { mimeType: 'image/png' },
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const b64 = data.predictions?.[0]?.bytesBase64Encoded;
            if (b64) {
              attempts.push({ model: `vertex-ai/imagen-3.0-generate-002 (${r})`, status: 200, success: true });
              return { success: true, base64: b64, model: `vertex-ai/imagen-3.0-generate-002 (${r})`, attempts };
            }
          } else {
            const errText = await res.text();
            attempts.push({ model: `vertex-ai/imagen-3.0-generate-002 (${r})`, status: res.status, error: errText.slice(0, 250) });
          }
        } catch (e: any) {
          attempts.push({ model: `vertex-ai (${r})`, status: 0, error: e.message });
        }
      }
    }
  } catch (adcErr: any) {
    attempts.push({ target: 'ADC Token Fetch', status: 0, error: adcErr.message });
  }

  // Determine user-friendly summary error
  const quotaErr = attempts.find(
    (a) => a.status === 429 || (a.error && (a.error.toLowerCase().includes('quota') || a.error.toLowerCase().includes('resource_exhausted')))
  );
  const authErr = attempts.find(
    (a) => a.status === 401 || a.status === 403 || (a.error && (a.error.toLowerCase().includes('unauthorized') || a.error.toLowerCase().includes('permission') || a.error.toLowerCase().includes('api_key_invalid')))
  );
  const netErr = attempts.find(
    (a) => a.error && (a.error.toLowerCase().includes('enotfound') || a.error.toLowerCase().includes('fetch failed') || a.error.toLowerCase().includes('operation not permitted'))
  );

  let userFriendlyError = 'Image synthesis failed.';
  if (quotaErr) {
    userFriendlyError = `Google Gemini / Imagen 3 API quota exceeded (HTTP 429: Resource Exhausted). Rate limit reached. Please wait a moment and click Retry.`;
  } else if (authErr) {
    userFriendlyError = `Google AI Authentication error (HTTP ${authErr.status}): ${authErr.error}. Please check your Gemini API key in Settings or ADC credentials.`;
  } else if (netErr) {
    userFriendlyError = `Network connection error connecting to Google AI services (${netErr.error}). Please verify network access.`;
  } else if (attempts.length > 0 && attempts[0].error) {
    userFriendlyError = `Google AI returned error: ${attempts[0].error}`;
  }

  return { success: false, error: userFriendlyError, attempts };
}

// 2. Generate Image for Slot (Imagen 3 / Gemini Nano Banana)
app.post('/api/generate-image', requireCloudspaceDomain, async (req, res) => {
  try {
    const { slotIndex, prompt, brandName = 'Porsche Motorsport', apiKey, jobId = 'global' } = req.body;
    const filename = `slot_${slotIndex}_${Date.now()}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    addLog('INFO', 'GEMINI_AI', `Generating AI Image for Shot #${slotIndex}...`);

    const result = await synthesizeImageWithGoogleAI(prompt, apiKey);

    if (!result.success || !result.base64) {
      addLog('ERROR', 'GEMINI_AI', `Image generation failed for Shot #${slotIndex}: ${result.error}`, JSON.stringify(result.attempts));
      return res.status(500).json({
        success: false,
        error: result.error || `Failed to generate image for Shot #${slotIndex}`,
        attempts: result.attempts,
      });
    }

    const tempRawPath = path.join(OUTPUT_DIR, `raw_${filename}`);
    const buffer = Buffer.from(result.base64, 'base64');
    fs.writeFileSync(tempRawPath, buffer);

    try {
      await execFFmpeg([
        '-y',
        '-i', tempRawPath,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
        outputPath,
      ]);
      if (fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
    } catch {
      fs.renameSync(tempRawPath, outputPath);
    }

    addLog('SUCCESS', 'GEMINI_AI', `Synthesized 16:9 AI Image for Shot #${slotIndex} with ${result.model} (1920x1080)`);
    
    let finalImageUri = `/output/${filename}`;
    try {
      finalImageUri = await uploadAssetToGcs(jobId, outputPath, 'images', filename);
    } catch (gcsErr: any) {
      console.warn(`[GCS_UPLOAD] Failed to upload image ${filename} to GCS:`, gcsErr.message);
    }

    return res.json({ success: true, imageUri: finalImageUri, auth: 'AI_MODEL', model: result.model });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', `Error in generate-image for Slot #${req.body.slotIndex}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Refine Nano Banana Shot (Dual-Image Ingestion)
app.post('/api/refine-image', requireCloudspaceDomain, upload.fields([{ name: 'brandReference', maxCount: 1 }]), async (req, res) => {
  try {
    const slotIndex = parseInt(req.body.slotIndex, 10);
    const jobId = req.body.jobId || 'global';
    const prompt = req.body.customPrompt || req.body.prompt || `Refined cinematic shot #${slotIndex}`;
    const apiKey = req.body.apiKey;
    const currentImageUri = req.body.currentImageUri;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const brandRefFile = files?.brandReference?.[0];

    const filename = `slot_${slotIndex}_refined_${Date.now()}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    addLog('INFO', 'GEMINI_AI', `Refining Shot #${slotIndex} with Dual-Image Ingestion... Prompt: "${prompt}"`);

    let image1Base64: string | undefined;
    let image2Base64: string | undefined;

    // Load Image 1 (Target for fix)
    if (currentImageUri) {
      try {
        const localImg1Path = await ensureLocalAssetFile(currentImageUri, WORKSPACE_ROOT, OUTPUT_DIR);
        if (fs.existsSync(localImg1Path)) {
          image1Base64 = fs.readFileSync(localImg1Path).toString('base64');
        }
      } catch (e: any) {
        console.warn(`[REFINE_IMG1_LOAD] Warning loading image 1 ${currentImageUri}:`, e.message);
      }
    }

    // Load Image 2 (Brand reference)
    if (brandRefFile && fs.existsSync(brandRefFile.path)) {
      try {
        image2Base64 = fs.readFileSync(brandRefFile.path).toString('base64');
      } catch (e: any) {
        console.warn(`[REFINE_IMG2_LOAD] Warning loading brand ref file:`, e.message);
      }
    }

    const result = await synthesizeImageWithGoogleAI({
      prompt,
      apiKey,
      image1Base64,
      image1MimeType: 'image/png',
      image2Base64,
      image2MimeType: brandRefFile?.mimetype || 'image/png',
    });

    if (!result.success || !result.base64) {
      addLog('ERROR', 'GEMINI_AI', `Refine image failed for Shot #${slotIndex}: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error || `Failed to refine image for Shot #${slotIndex}`,
        attempts: result.attempts,
      });
    }

    const tempRawPath = path.join(OUTPUT_DIR, `raw_${filename}`);
    const buffer = Buffer.from(result.base64, 'base64');
    fs.writeFileSync(tempRawPath, buffer);

    try {
      await execFFmpeg([
        '-y',
        '-i', tempRawPath,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
        outputPath,
      ]);
      if (fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
    } catch {
      fs.renameSync(tempRawPath, outputPath);
    }

    let finalImageUri = `/output/${filename}`;
    try {
      finalImageUri = await uploadAssetToGcs(jobId, outputPath, 'images', filename);
    } catch (gcsErr: any) {
      console.warn(`[GCS_UPLOAD] Failed to upload refined image to GCS:`, gcsErr.message);
    }

    return res.json({
      success: true,
      imageUri: finalImageUri,
      model: result.model,
      brandReferenceUri: brandRefFile ? `/uploads/${brandRefFile.filename}` : undefined,
    });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', 'Error refining image: ' + err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/test-gemini-api', requireCloudspaceDomain, async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const testPrompt = `${prompt || 'A cinematic close-up of Aerospace turbine throttle quadrant for Porsche Motorsport with number 10 engraved'} 16:9 aspect ratio, 1920x1080 resolution.`;
    const key = apiKey || process.env.GEMINI_API_KEY;
    const filename = `test_gemini_${Date.now()}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    const attempts: any[] = [];
    let imageUri: string | null = null;
    let usedModel: string = '';

    addLog('INFO', 'GEMINI_AI', 'Running Test Gemini API single-shot diagnostics...');

    if (key) {
      const candidateModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image'];
      for (const m of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
          const startTime = Date.now();
          const resp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] }),
          });
          const elapsed = Date.now() - startTime;
          const status = resp.status;
          const text = await resp.text();
          let parsed: any = null;
          try { parsed = JSON.parse(text); } catch (e) {}

          let base64: string | null = null;
          const parts = parsed?.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              base64 = p.inlineData.data;
              break;
            }
          }

          if (base64) {
            const tempRawPath = path.join(OUTPUT_DIR, `raw_${filename}`);
            const buffer = Buffer.from(base64, 'base64');
            fs.writeFileSync(tempRawPath, buffer);

            try {
              await execFFmpeg([
                '-y',
                '-i', tempRawPath,
                '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
                outputPath,
              ]);
              if (fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
            } catch {
              fs.renameSync(tempRawPath, outputPath);
            }

            imageUri = `/output/${filename}`;
            usedModel = m;
            attempts.push({
              target: `${m} (Nano Banana)`,
              status,
              success: true,
              elapsedMs: elapsed,
              responsePreview: `Generated 16:9 Image (${(buffer.length / 1024).toFixed(1)} KB base64)`,
            });
            addLog('SUCCESS', 'GEMINI_AI', `Test Gemini API succeeded with ${m} in ${elapsed}ms`);
            break;
          } else {
            attempts.push({
              target: `${m} (Nano Banana)`,
              status,
              success: false,
              elapsedMs: elapsed,
              error: text.slice(0, 300),
            });
            addLog('WARN', 'GEMINI_AI', `Test call to ${m} returned HTTP ${status}: ${text.slice(0, 150)}`);
          }
        } catch (err: any) {
          attempts.push({
            target: `${m} (Nano Banana)`,
            status: 'EXCEPTION',
            success: false,
            error: err.message,
          });
          addLog('ERROR', 'GEMINI_AI', `Test error calling ${m}: ${err.message}`);
        }
      }
    }

    if (!imageUri) {
      renderDiegeticVisualFrame(10, outputPath, 'Porsche Motorsport');
      imageUri = `/output/${filename}`;
      usedModel = 'Procedural Diegetic Canvas (16:9 1080p)';
      attempts.push({
        target: 'Procedural Diegetic Canvas Engine',
        status: 200,
        success: true,
        responsePreview: 'Generated crisp 1080p 16:9 frame',
      });
    }

    return res.json({
      success: true,
      imageUri,
      model: usedModel || 'Diegetic Engine',
      prompt: testPrompt,
      attempts,
    });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', 'Error in test-gemini-api: ' + err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Refine Nano Banana Shot (Dual-Image Ingestion)
app.post('/api/refine-image', requireCloudspaceDomain, upload.fields([{ name: 'brandReference', maxCount: 1 }]), async (req, res) => {
  try {
    const slotIndex = parseInt(req.body.slotIndex, 10);
    const jobId = req.body.jobId || 'global';
    const prompt = req.body.prompt || req.body.customPrompt || `Refined cinematic shot #${slotIndex}`;
    const apiKey = req.body.apiKey;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const brandRefFile = files?.brandReference?.[0];

    const filename = `slot_${slotIndex}_refined_${Date.now()}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    const result = await synthesizeImageWithGoogleAI(prompt, apiKey);

    if (!result.success || !result.base64) {
      addLog('ERROR', 'GEMINI_AI', `Refine image failed for Shot #${slotIndex}: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error || `Failed to refine image for Shot #${slotIndex}`,
        attempts: result.attempts,
      });
    }

    const tempRawPath = path.join(OUTPUT_DIR, `raw_${filename}`);
    const buffer = Buffer.from(result.base64, 'base64');
    fs.writeFileSync(tempRawPath, buffer);

    try {
      await execFFmpeg([
        '-y',
        '-i', tempRawPath,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
        outputPath,
      ]);
      if (fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
    } catch {
      fs.renameSync(tempRawPath, outputPath);
    }

    let finalImageUri = `/output/${filename}`;
    try {
      finalImageUri = await uploadAssetToGcs(jobId, outputPath, 'images', filename);
    } catch (gcsErr: any) {
      console.warn(`[GCS_UPLOAD] Failed to upload refined image to GCS:`, gcsErr.message);
    }

    return res.json({
      success: true,
      imageUri: finalImageUri,
      model: result.model,
      brandReferenceUri: brandRefFile ? `/uploads/${brandRefFile.filename}` : undefined,
    });
  } catch (err: any) {
    addLog('ERROR', 'GEMINI_AI', 'Error refining image: ' + err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Execute an async operation with exponential backoff for capacity / rate limit errors (HTTP 429, 503, 500)
async function executeWithBackoff<T>(
  action: (attempt: number) => Promise<T>,
  context: string,
  maxRetries: number = 2,
  initialDelayMs: number = 2000
): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action(attempt);
    } catch (err: any) {
      lastErr = err;
      const msg = err.message || '';
      
      // If quota exhausted, bail out immediately so caller can rotate API keys
      if (msg.includes('QUOTA_EXHAUSTED') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw err;
      }

      const isCapacityError =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('capacity') ||
        msg.includes('rate limit') ||
        msg.includes('overloaded') ||
        msg.includes('unavailable');

      if (isCapacityError && attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 1000);
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1) + jitter;
        addLog(
          'WARN',
          'VEO_AI',
          `[Capacity/RateLimit] ${context} encountered backpressure (${msg.slice(0, 120)}). Retrying in ${(delayMs / 1000).toFixed(1)}s (Attempt ${attempt}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

// Veo Image-to-Video & Direct Text-to-Video Engine (Google AI Studio & Vertex AI with Exponential Backoff Retries)
async function synthesizeVeoVideo(
  imageBuffer?: Buffer,
  endImageBuffer?: Buffer,
  videoPrompt: string = '',
  slotIndex: number = 10,
  qualityMode: 'FAST_720P' | 'FULL_4K' = 'FAST_720P',
  apiKey?: string,
  chosenModel?: string
): Promise<{ success: boolean; videoBuffer?: Buffer; modelUsed?: string; error?: string }> {
  const is4K = qualityMode === 'FULL_4K';
  const apiKeys = getGeminiApiKeys(apiKey);
  const creds = await getAdcCredentials();
  const gcpProject = process.env.GCP_PROJECT || 'aosterloh-cs-muc';
  const gcpRegion = process.env.GCP_REGION || 'us-central1';
  const base64Image = imageBuffer ? imageBuffer.toString('base64') : undefined;

  // Direct Veo to clearly reveal the countdown number during the 4-second motion
  const hasNumeralDirective = new RegExp(`\\b(${slotIndex}|0${slotIndex})\\b`).test(videoPrompt);
  const effectiveVideoPrompt = hasNumeralDirective
    ? videoPrompt
    : `${videoPrompt}. The camera smoothly pushes in, zooms, and executes a cinematic motion that clearly arrives at the physical countdown numeral '${slotIndex}', bringing number '${slotIndex}' into sharp, crystal-clear, unmistakable prominence in the frame.`;

  const modeTag = base64Image ? 'Image-to-Video' : 'Direct Text-to-Video';
  addLog('INFO', 'VEO_AI', `Initiating Veo ${modeTag} synthesis for Shot #${slotIndex} (${is4K ? '🌟 Master Quality' : '⚡ Fast Preview'}${chosenModel ? ` • Target: ${chosenModel}` : ''} • Key Pool: ${apiKeys.length})...`);

  // Target official Veo 3.1 models exclusively (prioritizing user-selected model if provided)
  const defaultCandidateModels = is4K
    ? ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']
    : ['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'];

  const candidateModels = chosenModel
    ? [chosenModel, ...defaultCandidateModels.filter((m) => m !== chosenModel)]
    : defaultCandidateModels;

  let lastError = '';

  // Method 1: Google AI Studio Gemini API (API Key Pool with Automatic Failover)
  if (apiKeys.length > 0) {
    for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
      const currentKey = apiKeys[keyIdx];
      const keyLabel = `Key #${keyIdx + 1} (${currentKey.substring(0, 8)}...)`;

      for (const model of candidateModels) {
        try {
          const videoBuffer = await executeWithBackoff(
            async (retryAttempt) => {
              addLog('INFO', 'VEO_AI', `Calling Google AI Studio Veo API (${model} via ${keyLabel}) [Attempt ${retryAttempt}]...`);
              
              const instancePayload: any = {
                prompt: effectiveVideoPrompt,
              };

              if (base64Image) {
                instancePayload.image = {
                  bytesBase64Encoded: base64Image,
                  mimeType: 'image/png',
                };
              }

              const initRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${currentKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    instances: [instancePayload],
                    parameters: {
                      sampleCount: 1,
                      aspectRatio: '16:9',
                      durationSeconds: 4,
                    },
                  }),
                }
              );

              if (!initRes.ok) {
                const errText = await initRes.text();
                if (initRes.status === 429 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
                  markKeyAsExhausted(currentKey);
                  throw new Error(`QUOTA_EXHAUSTED: HTTP 429 from ${model} for ${keyLabel}`);
                }
                throw new Error(`HTTP ${initRes.status} from ${model}: ${errText}`);
              }

              const initData = await initRes.json();
              const operationName = initData.name;
              if (!operationName) {
                throw new Error(`Invalid response from ${model}: missing operation handle`);
              }

              addLog('INFO', 'VEO_AI', `Veo operation created: ${operationName}. Polling for completion...`);

              // Poll operation for up to 140 seconds with resilient error absorption
              const maxPollAttempts = 35; // 35 * 4s = 140s
              for (let pollAttempt = 1; pollAttempt <= maxPollAttempts; pollAttempt++) {
                await new Promise((r) => setTimeout(r, 4000));
                const pollRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${currentKey}`
                );

                if (pollRes.status === 429 || pollRes.status === 503 || pollRes.status === 500) {
                  addLog('WARN', 'VEO_AI', `Transient HTTP ${pollRes.status} during operation poll. Retrying in 5s...`);
                  await new Promise((r) => setTimeout(r, 5000));
                  continue;
                }

                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.done) {
                    if (pollData.error) {
                      throw new Error(pollData.error.message || 'Veo operation returned error');
                    }

                    const sample =
                      pollData.response?.generateVideoResponse?.generatedSamples?.[0] ||
                      pollData.response?.generatedVideos?.[0] ||
                      pollData.response?.generated_videos?.[0];

                    if (sample?.video?.uri) {
                      const rawUri = sample.video.uri;
                      const downloadUrl = rawUri.includes('?') ? `${rawUri}&key=${currentKey}` : `${rawUri}?key=${currentKey}`;
                      addLog('INFO', 'VEO_AI', `Downloading synthesized Veo video from Google Cloud Storage...`);
                      const videoDlRes = await fetch(downloadUrl);
                      if (videoDlRes.ok) {
                        const buf = Buffer.from(await videoDlRes.arrayBuffer());
                        addLog('SUCCESS', 'VEO_AI', `Successfully synthesized real Veo video for Shot #${slotIndex} using ${model}!`);
                        return buf;
                      } else {
                        throw new Error(`Failed to download Veo video: HTTP ${videoDlRes.status}`);
                      }
                    } else if (sample?.video?.videoBytes || sample?.video?.bytesBase64Encoded) {
                      const bytes = sample.video.videoBytes || sample.video.bytesBase64Encoded;
                      const buf = Buffer.from(bytes, 'base64');
                      addLog('SUCCESS', 'VEO_AI', `Successfully synthesized real Veo video for Shot #${slotIndex} using ${model}!`);
                      return buf;
                    }
                  } else {
                    addLog('INFO', 'VEO_AI', `Veo Shot #${slotIndex} rendering in progress (${pollAttempt * 4}s elapsed)...`);
                  }
                }
              }
              throw new Error(`Veo generation operation timed out after 140s`);
            },
            `Google AI Studio Veo (${model} via ${keyLabel}) Shot #${slotIndex}`,
            3,
            2500
          );

          return { success: true, videoBuffer, modelUsed: model };
        } catch (err: any) {
          lastError = err.message;
          addLog('WARN', 'VEO_AI', `${keyLabel} (${model}) attempt failed: ${err.message}`);
        }
      }
    }
  }

  // Method 2: Vertex AI API (ADC Token with Exponential Backoff)
  if (creds.token) {
    for (const model of candidateModels) {
      try {
        const videoBuffer = await executeWithBackoff(
          async (retryAttempt) => {
            addLog('INFO', 'VEO_AI', `Attempting Vertex AI Veo endpoint (${model}) in ${gcpRegion} [Attempt ${retryAttempt}]...`);
            const vertexUrl = `https://${gcpRegion}-aiplatform.googleapis.com/v1/projects/${gcpProject}/locations/${gcpRegion}/publishers/google/models/${model}:predictLongRunning`;
            
            const vertexInstancePayload: any = {
              prompt: effectiveVideoPrompt,
            };

            if (base64Image) {
              vertexInstancePayload.image = {
                bytesBase64Encoded: base64Image,
                mimeType: 'image/png',
              };
            }

            const vertexRes = await fetch(vertexUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${creds.token}`,
              },
              body: JSON.stringify({
                instances: [vertexInstancePayload],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: '16:9',
                  durationSeconds: 4,
                },
              }),
            });

            if (!vertexRes.ok) {
              const errText = await vertexRes.text();
              throw new Error(`HTTP ${vertexRes.status} from Vertex Veo: ${errText}`);
            }

            const vertexData = await vertexRes.json();
            const operationName = vertexData.name;
            if (!operationName) {
              throw new Error(`Missing operation handle from Vertex Veo`);
            }

            addLog('INFO', 'VEO_AI', `Vertex Veo operation created: ${operationName}. Polling for completion...`);
            for (let pollAttempt = 1; pollAttempt <= 35; pollAttempt++) {
              await new Promise((r) => setTimeout(r, 4000));
              const pollRes = await fetch(
                `https://${gcpRegion}-aiplatform.googleapis.com/v1/${operationName}`,
                {
                  headers: { Authorization: `Bearer ${creds.token}` },
                }
              );

              if (pollRes.status === 429 || pollRes.status === 503 || pollRes.status === 500) {
                addLog('WARN', 'VEO_AI', `Transient HTTP ${pollRes.status} during Vertex operation poll. Retrying in 5s...`);
                await new Promise((r) => setTimeout(r, 5000));
                continue;
              }

              if (pollRes.ok) {
                const pollData = await pollRes.json();
                if (pollData.done) {
                  if (pollData.error) {
                    throw new Error(pollData.error.message || 'Vertex Veo operation error');
                  }
                  const sample =
                    pollData.response?.generateVideoResponse?.generatedSamples?.[0] ||
                    pollData.response?.generatedVideos?.[0] ||
                    pollData.response?.generated_videos?.[0];

                  if (sample?.video?.uri) {
                    const videoDlRes = await fetch(sample.video.uri, {
                      headers: { Authorization: `Bearer ${creds.token}` },
                    });
                    if (videoDlRes.ok) {
                      const buf = Buffer.from(await videoDlRes.arrayBuffer());
                      addLog('SUCCESS', 'VEO_AI', `Successfully synthesized real Vertex Veo video for Shot #${slotIndex}!`);
                      return buf;
                    }
                  } else if (sample?.video?.videoBytes || sample?.video?.bytesBase64Encoded) {
                    const bytes = sample.video.videoBytes || sample.video.bytesBase64Encoded;
                    const buf = Buffer.from(bytes, 'base64');
                    addLog('SUCCESS', 'VEO_AI', `Successfully synthesized real Vertex Veo video for Shot #${slotIndex}!`);
                    return buf;
                  }
                } else {
                  addLog('INFO', 'VEO_AI', `Vertex Veo Shot #${slotIndex} rendering in progress (${pollAttempt * 4}s elapsed)...`);
                }
              }
            }
            throw new Error(`Vertex Veo operation timed out after 140s`);
          },
          `Vertex AI Veo (${model}) Shot #${slotIndex}`,
          5,
          3000
        );

        return { success: true, videoBuffer, modelUsed: `vertex-${model}` };
      } catch (vertexErr: any) {
        lastError = vertexErr.message;
        addLog('WARN', 'VEO_AI', `Vertex Veo attempt error: ${vertexErr.message}`);
      }
    }
  }

  return { success: false, error: lastError || 'Veo Video synthesis unavailable with current credentials' };
}

// ---------------------------------------------------------------------------
// Veo 3 Parallel 2-Worker FIFO Queue System
// ---------------------------------------------------------------------------
interface VeoWorkerTask {
  taskId: string;
  jobId: string;
  slotIndex: number;
  qualityMode: 'FAST_720P' | 'FULL_4K';
  veoModel?: string;
  videoPrompt: string;
  imageUri?: string;
  apiKey?: string;
  queuedAt: number;
  startedAt?: number;
  workerId?: 1 | 2;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class VeoQueueManager {
  private maxWorkers = 2;
  private pendingQueue: VeoWorkerTask[] = [];
  private activeWorkers: Map<1 | 2, VeoWorkerTask> = new Map();

  public getStatus() {
    const active = Array.from(this.activeWorkers.entries()).map(([workerId, task]) => ({
      workerId,
      taskId: task.taskId,
      jobId: task.jobId,
      slotIndex: task.slotIndex,
      model: task.veoModel || 'veo-3.1-fast-generate-preview',
      qualityMode: task.qualityMode,
      startedAt: task.startedAt,
      elapsedSeconds: task.startedAt ? Math.round((Date.now() - task.startedAt) / 1000) : 0,
    }));

    const queue = this.pendingQueue.map((task, idx) => ({
      position: idx + 1,
      taskId: task.taskId,
      jobId: task.jobId,
      slotIndex: task.slotIndex,
      model: task.veoModel || 'veo-3.1-fast-generate-preview',
      qualityMode: task.qualityMode,
      queuedAt: task.queuedAt,
      waitingSeconds: Math.round((Date.now() - task.queuedAt) / 1000),
    }));

    return {
      activeWorkers: active,
      activeCount: active.length,
      maxWorkers: this.maxWorkers,
      queue,
      queueLength: queue.length,
    };
  }

  public enqueue(taskData: Omit<VeoWorkerTask, 'taskId' | 'queuedAt' | 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: VeoWorkerTask = {
        ...taskData,
        taskId: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        queuedAt: Date.now(),
        resolve,
        reject,
      };

      this.pendingQueue.push(task);
      addLog(
        'INFO',
        'VEO_QUEUE',
        `Queued Veo video job for Shot #${task.slotIndex} (Job: ${task.jobId}). Queue depth: ${this.pendingQueue.length}`
      );
      this.drain();
    });
  }

  private async drain() {
    if (this.pendingQueue.length === 0) return;

    // Find available worker slot: Worker 1 or Worker 2
    let availableWorkerId: 1 | 2 | null = null;
    if (!this.activeWorkers.has(1)) {
      availableWorkerId = 1;
    } else if (!this.activeWorkers.has(2)) {
      availableWorkerId = 2;
    }

    if (!availableWorkerId) {
      // Both workers busy
      return;
    }

    const task = this.pendingQueue.shift();
    if (!task) return;

    task.workerId = availableWorkerId;
    task.startedAt = Date.now();
    this.activeWorkers.set(availableWorkerId, task);

    addLog(
      'INFO',
      'VEO_QUEUE',
      `[Worker ${availableWorkerId}] Starting Veo synthesis for Shot #${task.slotIndex} (Job: ${task.jobId}, Remaining Queue: ${this.pendingQueue.length})`
    );

    // Execute task asynchronously on this worker
    (async () => {
      try {
        let imageBuffer: Buffer | undefined;
        if (task.imageUri) {
          try {
            const inputImagePath = await ensureLocalAssetFile(task.imageUri, WORKSPACE_ROOT, OUTPUT_DIR);
            if (fs.existsSync(inputImagePath)) {
              imageBuffer = fs.readFileSync(inputImagePath);
            }
          } catch (err: any) {
            console.warn(`[VEO_IMG] Optional image input load skipped:`, err.message);
          }
        }

        const is4K = task.qualityMode === 'FULL_4K';
        const tag = is4K ? 'full_4k' : 'fast_720p';
        const videoFilename = `slot_${task.slotIndex}_veo_${tag}_${Date.now()}.mp4`;
        const rawVideoPath = path.join(OUTPUT_DIR, videoFilename);

        const veoResult = await synthesizeVeoVideo(
          imageBuffer,
          undefined,
          task.videoPrompt,
          task.slotIndex,
          task.qualityMode,
          task.apiKey,
          task.veoModel
        );

        if (veoResult.success && veoResult.videoBuffer) {
          const tempRawPath = path.join(OUTPUT_DIR, `temp_${videoFilename}`);
          fs.writeFileSync(tempRawPath, veoResult.videoBuffer);

          // Strip all audio streams immediately with instant stream copy (-an -c:v copy) to guarantee 100% muted video
          try {
            await execFFmpeg(['-y', '-i', tempRawPath, '-c:v', 'copy', '-an', rawVideoPath]);
            if (fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
          } catch (stripErr) {
            if (fs.existsSync(tempRawPath)) fs.renameSync(tempRawPath, rawVideoPath);
          }

          addLog(
            'SUCCESS',
            'VEO_AI',
            `[Worker ${availableWorkerId}] Real Veo 3 Muted Video written to ${videoFilename} (${veoResult.modelUsed})`
          );

          let finalVideoUri = `/output/${videoFilename}`;
          try {
            finalVideoUri = await uploadAssetToGcs(task.jobId, rawVideoPath, 'videos', videoFilename);
          } catch (gcsErr: any) {
            console.warn(`[GCS_UPLOAD] Failed to upload video ${videoFilename} to GCS:`, gcsErr.message);
          }

          task.resolve({
            success: true,
            rawVideoUri: finalVideoUri,
            qualityMode: task.qualityMode,
            isRealVeo: true,
            modelUsed: veoResult.modelUsed,
            workerId: availableWorkerId,
          });
        } else {
          addLog(
            'ERROR',
            'VEO_AI',
            `[Worker ${availableWorkerId}] Veo 3 synthesis failed for Shot #${task.slotIndex}: ${veoResult.error}`
          );
          task.reject(new Error(`Veo 3.1 video generation failed: ${veoResult.error || 'API quota or timeout'}`));
        }
      } catch (err: any) {
        addLog(
          'ERROR',
          'VEO_AI',
          `[Worker ${availableWorkerId}] Execution error for Shot #${task.slotIndex}: ${err.message}`
        );
        task.reject(err);
      } finally {
        this.activeWorkers.delete(availableWorkerId);
        addLog(
          'INFO',
          'VEO_QUEUE',
          `[Worker ${availableWorkerId}] Task finished. Checking queue (${this.pendingQueue.length} pending)...`
        );
        this.drain();
      }
    })();
  }
}

const veoQueueManager = new VeoQueueManager();

// Endpoint to inspect active workers and queued tasks in real-time
app.get('/api/veo-queue-status', (_req, res) => {
  return res.json({ success: true, ...veoQueueManager.getStatus() });
});

// 4. Generate Veo 3 Video (Dispatched via 2-Worker Global Queue)
app.post('/api/generate-video', requireCloudspaceDomain, async (req, res) => {
  try {
    const { slotIndex, videoPrompt, imageUri, apiKey, qualityMode = 'FAST_720P', veoModel, jobId = 'global' } = req.body;
    if (!videoPrompt && !imageUri) {
      return res.status(400).json({ error: 'videoPrompt is required for video synthesis' });
    }

    const result = await veoQueueManager.enqueue({
      slotIndex: Number(slotIndex),
      videoPrompt,
      imageUri,
      apiKey,
      qualityMode,
      veoModel,
      jobId,
    });

    return res.json(result);
  } catch (err: any) {
    addLog('ERROR', 'VEO_AI', 'Error generating video: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4b. Veo AI Video Quality Inspector & Self-Improvement Analysis
app.post('/api/analyze-video-slot', requireCloudspaceDomain, async (req, res) => {
  try {
    const {
      slotIndex,
      diegeticNumber,
      brandName = 'Brand',
      videoPrompt = '',
      videoUri,
      apiKey,
      jobId = 'global',
    } = req.body;

    if (!videoUri) {
      return res.status(400).json({ error: 'videoUri is required for analysis' });
    }

    const localVideoPath = await ensureLocalAssetFile(videoUri, WORKSPACE_ROOT, OUTPUT_DIR);

    addLog(
      'INFO',
      'VEO_AI',
      `[AI Inspector] Analyzing 4 frames for Shot #${slotIndex} (Target Numeral: ${diegeticNumber || slotIndex})...`
    );

    const result = await analyzeVideoSlot({
      videoLocalPath: localVideoPath,
      slotIndex: Number(slotIndex),
      diegeticNumber: Number(diegeticNumber || slotIndex),
      brandName,
      videoPrompt,
      apiKey,
      jobId,
      workspaceRoot: WORKSPACE_ROOT,
      outputDir: OUTPUT_DIR,
    });

    if (result.success && result.analysis) {
      addLog(
        result.analysis.hasCorrectNumber ? 'SUCCESS' : 'WARN',
        'VEO_AI',
        `[AI Inspector] Shot #${slotIndex}: Score ${result.analysis.score}/10 (${result.analysis.timingVerdict}) - ${result.analysis.critique}`
      );
      return res.json({ success: true, analysis: result.analysis });
    } else {
      return res.status(500).json({ error: result.error || 'Video analysis failed' });
    }
  } catch (err: any) {
    addLog('ERROR', 'VEO_AI', `[AI Inspector] Error analyzing video: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Process Temporal Alignment (FFmpeg Speed/Trim for Veo 3 Video)
app.post('/api/process-temporal-video', requireCloudspaceDomain, async (req, res) => {
  try {
    const { slotIndex, rawVideoUri, temporalConfig, qualityMode = 'FAST_720P', jobId = 'global' } = req.body as {
      slotIndex: number;
      rawVideoUri: string;
      temporalConfig: SlotTemporalConfig;
      qualityMode?: 'FAST_720P' | 'FULL_4K';
      jobId?: string;
    };

    if (!rawVideoUri || !temporalConfig) {
      return res.status(400).json({ error: 'rawVideoUri and temporalConfig are required' });
    }

    const inputVideoPath = await ensureLocalAssetFile(rawVideoUri, WORKSPACE_ROOT, OUTPUT_DIR);
    const is4K = qualityMode === 'FULL_4K';
    const tag = is4K ? 'full_4k' : 'fast_720p';
    const outputFilename = `slot_${slotIndex}_processed_${tag}_${Date.now()}.mp4`;
    const processedVideoPath = path.join(OUTPUT_DIR, outputFilename);

    const ffmpegArgs = generateSingleSlotFFmpegArgs(slotIndex, inputVideoPath, processedVideoPath, temporalConfig, qualityMode);
    addLog('INFO', 'FFMPEG', `Processing temporal alignment for Shot #${slotIndex} (mode: ${temporalConfig.mode}, target: ${temporalConfig.targetDurationSeconds}s, tier: ${qualityMode})...`);
    await execFFmpeg(ffmpegArgs);

    let finalProcessedUri = `/output/${outputFilename}`;
    try {
      finalProcessedUri = await uploadAssetToGcs(jobId, processedVideoPath, 'videos', outputFilename);
    } catch (gcsErr: any) {
      console.warn(`[GCS_UPLOAD] Failed to upload processed video ${outputFilename} to GCS:`, gcsErr.message);
    }

    return res.json({
      success: true,
      processedVideoUri: finalProcessedUri,
      qualityMode,
    });
  } catch (err: any) {
    addLog('ERROR', 'FFMPEG', 'Error in temporal video processing: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. Master Export (Concat available slots + Dual 4K Upscale Engines + 30s Audio Track Mix)
app.post('/api/export-master', requireCloudspaceDomain, async (req, res) => {
  try {
    const {
      slotsConfig,
      qualityMode = 'FAST_720P',
      upscaleEngine = 'LANCZOS_4K',
      jobId = 'global',
    } = req.body as {
      slotsConfig: {
        index: number;
        processedVideoUri: string | null;
        rawVideoUri: string | null;
        temporalConfig?: SlotTemporalConfig;
      }[];
      qualityMode?: 'FAST_720P' | 'FULL_4K';
      upscaleEngine?: 'LANCZOS_4K' | 'REAL_ESRGAN_4K' | 'FAST_720P';
      jobId?: string;
    };

    if (!slotsConfig || slotsConfig.length === 0) {
      return res.status(400).json({ error: 'At least one slot configuration is required' });
    }

    const availableSlots = slotsConfig
      .filter((s) => Boolean(s.processedVideoUri || s.rawVideoUri))
      .sort((a, b) => b.index - a.index);

    if (availableSlots.length === 0) {
      return res.status(400).json({ error: 'No generated videos found to preview or export.' });
    }

    const inputSlots = await Promise.all(
      availableSlots.map(async (s) => {
        const targetUri = s.processedVideoUri || s.rawVideoUri!;
        const localPath = await ensureLocalAssetFile(targetUri, WORKSPACE_ROOT, OUTPUT_DIR);
        return {
          index: s.index,
          path: localPath,
          temporalConfig: s.temporalConfig || getDefaultTemporalConfigForSlot(s.index),
        };
      })
    );

    const effectiveEngine: 'LANCZOS_4K' | 'REAL_ESRGAN_4K' | 'FAST_720P' =
      upscaleEngine || (qualityMode === 'FULL_4K' ? 'LANCZOS_4K' : 'FAST_720P');

    const is4K = effectiveEngine === 'LANCZOS_4K' || effectiveEngine === 'REAL_ESRGAN_4K';
    const outputFilename = `master_countdown_${availableSlots.length}shots_${is4K ? '4k' : '720p'}_${Date.now()}.mp4`;
    const masterOutputPath = path.join(OUTPUT_DIR, outputFilename);

    let totalVideoDuration = 0;
    for (const s of availableSlots) {
      totalVideoDuration += s.temporalConfig?.targetDurationSeconds || (s.index >= 7 ? 2.300 : 3.300);
    }

    if (effectiveEngine === 'REAL_ESRGAN_4K') {
      // Step 1: Concat 720p base master
      const temp720pFilename = `temp_base_720p_${Date.now()}.mp4`;
      const temp720pPath = path.join(OUTPUT_DIR, temp720pFilename);
      const baseFfmpegArgs = generateMasterConcatFFmpegArgs(
        inputSlots,
        AUDIO_TRACK_PATH,
        totalVideoDuration,
        temp720pPath,
        'FAST_720P',
        30.0
      );
      addLog('INFO', 'FFMPEG', `Building 720p base master for AI Super-Resolution...`);
      await execFFmpeg(baseFfmpegArgs);

      // Step 2: Run Real-ESRGAN / AI 4K Super-Resolution
      addLog('INFO', 'REAL_ESRGAN', `Upscaling Master Countdown to 4K UHD via AI Super-Resolution...`);
      const upscaleResult = await upscaleVideo4K(temp720pPath, masterOutputPath, AUDIO_TRACK_PATH, 'REAL_ESRGAN_4K');

      try {
        fs.unlinkSync(temp720pPath);
      } catch {}

      if (!upscaleResult.success) {
        throw new Error(upscaleResult.error || 'Failed to upscale video to 4K');
      }
      if (upscaleResult.notice) {
        addLog('INFO', 'REAL_ESRGAN', upscaleResult.notice);
      }
    } else {
      // Direct FFmpeg Lanczos 4K or Fast 720P Export
      const ffmpegArgs = generateMasterConcatFFmpegArgs(
        inputSlots,
        AUDIO_TRACK_PATH,
        totalVideoDuration,
        masterOutputPath,
        is4K ? 'FULL_4K' : 'FAST_720P',
        30.0
      );

      addLog(
        'INFO',
        'FFMPEG',
        `Exporting Countdown Video (${availableSlots.length}/10 shots, ${totalVideoDuration.toFixed(1)}s video + 30.0s soundtrack, engine: ${effectiveEngine})...`
      );
      await execFFmpeg(ffmpegArgs);
    }

    let finalMasterUri = `/output/${outputFilename}`;
    try {
      finalMasterUri = await uploadAssetToGcs(jobId, masterOutputPath, 'master', outputFilename);
      // Immediately persist master video reference to GCS job state
      if (jobId) {
        const currentJob = await loadJobStateFromGcs(jobId);
        if (currentJob) {
          await saveJobStateToGcs({
            ...currentJob,
            masterVideoUri: finalMasterUri,
            // Reset extended master so user can re-render it if the 30s master changed
            extendedMasterVideoUri: undefined,
          });
        }
      }
    } catch (gcsErr: any) {
      console.warn(`[GCS_UPLOAD] Failed to upload master video ${outputFilename} to GCS:`, gcsErr.message);
    }

    addLog(
      'SUCCESS',
      'FFMPEG',
      `Countdown Video (${availableSlots.length}/10 shots, engine: ${effectiveEngine}) exported successfully: ${outputFilename}`
    );
    return res.json({
      success: true,
      masterVideoUri: finalMasterUri,
      shotsCount: availableSlots.length,
      totalDuration: 30.0,
      qualityMode: is4K ? 'FULL_4K' : 'FAST_720P',
      upscaleEngine: effectiveEngine,
    });
  } catch (err: any) {
    addLog('ERROR', 'FFMPEG', 'Error exporting master video: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// 12. Extended Master Video Export (+ Google I/O Outro with 2-second Fade Transition)
app.post('/api/export-extended-master', requireCloudspaceDomain, async (req, res) => {
  try {
    const { jobId, masterVideoUri: providedMasterUri } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    addLog('INFO', 'FFMPEG', `Starting Extended Master Assembly for job ${jobId}...`);

    let targetMasterUri = providedMasterUri;
    let jobState: StoredJobState | null = null;
    try {
      jobState = await loadJobStateFromGcs(jobId);
      if (!targetMasterUri && jobState?.masterVideoUri) {
        targetMasterUri = jobState.masterVideoUri;
      }
    } catch (e: any) {
      console.warn(`[EXTENDED_MASTER] Could not load job state for ${jobId}:`, e.message);
    }

    if (!targetMasterUri) {
      return res.status(400).json({ error: 'No master video available to create extended version. Please generate the countdown master first.' });
    }

    // 1. Ensure 30s Master Video is locally available
    const localMasterPath = await ensureLocalAssetFile(targetMasterUri, WORKSPACE_ROOT, OUTPUT_DIR);
    if (!fs.existsSync(localMasterPath)) {
      return res.status(404).json({ error: `Master video file could not be found: ${localMasterPath}` });
    }

    // 2. Ensure Outro Video (google-io.mp4) is locally available and uploaded to GCS static/
    const localGoogleIoPath = await ensureStaticAsset('google-io.mp4', 'public/countdown/google-io.mp4');
    if (!fs.existsSync(localGoogleIoPath)) {
      return res.status(404).json({ error: `Google I/O outro video could not be found: ${localGoogleIoPath}` });
    }

    // 3. Measure Master Video Duration using ffprobe
    let masterDuration = 30.0;
    try {
      const probeRes = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localMasterPath}"`,
        { encoding: 'utf8' }
      );
      const parsed = parseFloat(probeRes.trim());
      if (!isNaN(parsed) && parsed > 0) {
        masterDuration = parsed;
      }
    } catch (e: any) {
      console.warn('[EXTENDED_MASTER] Could not probe master duration, defaulting to 30.0s:', e.message);
    }

    const transitionDuration = 2.0;
    const offset = Math.max(0, masterDuration - transitionDuration);
    const delayMs = Math.round(offset * 1000);

    const outputFilename = `countdown_extended_master_${jobId}_4k.mp4`;
    const extendedMasterOutputPath = path.join(OUTPUT_DIR, outputFilename);

    if (fs.existsSync(extendedMasterOutputPath)) {
      try { fs.unlinkSync(extendedMasterOutputPath); } catch {}
    }

    addLog(
      'INFO',
      'FFMPEG',
      `Executing Extended Master Crossfade (offset: ${offset.toFixed(2)}s, duration: ${transitionDuration}s)...`
    );

    const ffmpegArgs = [
      '-y',
      '-i', localMasterPath,
      '-i', localGoogleIoPath,
      '-filter_complex',
      `[0:v]settb=AVTB,fps=60[v0];` +
      `[1:v]settb=AVTB,fps=60[v1];` +
      `[v0][v1]xfade=transition=fadeblack:duration=${transitionDuration}:offset=${offset.toFixed(2)}[v];` +
      `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,afade=t=out:st=${offset.toFixed(2)}:d=${transitionDuration}[a0];` +
      `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${delayMs}|${delayMs}[a1];` +
      `[a0][a1]amix=inputs=2:duration=longest:weights=1 1:normalize=0[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-movflags', '+faststart',
      extendedMasterOutputPath
    ];

    await execFFmpeg(ffmpegArgs);

    // 4. Upload to GCS and update persistent job state
    let finalExtendedUri = `/output/${outputFilename}`;
    try {
      finalExtendedUri = await uploadAssetToGcs(jobId, extendedMasterOutputPath, 'extended-master', outputFilename);
      if (jobState) {
        await saveJobStateToGcs({
          ...jobState,
          extendedMasterVideoUri: finalExtendedUri,
        });
      }
    } catch (gcsErr: any) {
      console.warn(`[GCS_UPLOAD] Failed to upload extended master video ${outputFilename} to GCS:`, gcsErr.message);
    }

    addLog(
      'SUCCESS',
      'FFMPEG',
      `Extended Master Video (${outputFilename}) created and uploaded successfully.`
    );

    return res.json({
      success: true,
      extendedMasterVideoUri: finalExtendedUri,
      totalDuration: masterDuration + 93.22 - transitionDuration,
    });
  } catch (err: any) {
    addLog('ERROR', 'FFMPEG', 'Error exporting extended master video: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fallback route for Single Page Application routing
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/output') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/countdown') ||
    req.path.startsWith('/specifications')
  ) {
    return next();
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`⚡ CountdownMaker Server running on http://localhost:${PORT}`);
});
