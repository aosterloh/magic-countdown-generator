import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

interface SceneVisualDef {
  num: number;
  title: string;
  subtitle: string;
  themeColor: string;
  accentColor: string;
  renderSvg: (brandName: string) => string;
}

export function generateCinematicSceneSvg(slotIndex: number, brandName: string): string {
  const brand = (brandName || 'Porsche Motorsport').toUpperCase();

  switch (slotIndex) {
    case 10:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#141e30"/>
            <stop offset="50%" stop-color="#0b111e"/>
            <stop offset="100%" stop-color="#03060b"/>
          </radialGradient>
          <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#475569"/>
            <stop offset="50%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4285F4"/>
            <stop offset="50%" stop-color="#00f2fe"/>
            <stop offset="100%" stop-color="#4facfe"/>
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg)"/>
        <!-- Anamorphic Blue Flare Streak -->
        <rect x="0" y="538" width="1920" height="4" fill="#00f2fe" opacity="0.35" filter="url(#glow)"/>
        <!-- Turbine Radial Geometry -->
        <g transform="translate(960, 540)" opacity="0.15">
          ${Array.from({ length: 24 }).map((_, i) => `<line x1="0" y1="0" x2="${Math.cos((i * 15 * Math.PI) / 180) * 800}" y2="${Math.sin((i * 15 * Math.PI) / 180) * 800}" stroke="#4285F4" stroke-width="2"/>`).join('')}
        </g>
        <!-- Outer Titanium Bezel -->
        <circle cx="960" cy="540" r="380" fill="none" stroke="url(#metal)" stroke-width="28" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.8))"/>
        <circle cx="960" cy="540" r="396" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="8 6"/>
        <circle cx="960" cy="540" r="350" fill="#070d19" stroke="#1e293b" stroke-width="6"/>
        <!-- Active Dial Arc -->
        <circle cx="960" cy="540" r="320" fill="none" stroke="#1e293b" stroke-width="18"/>
        <circle cx="960" cy="540" r="320" fill="none" stroke="url(#neonGlow)" stroke-width="18" stroke-dasharray="1800 200" stroke-linecap="round" filter="url(#glow)"/>
        <!-- Dial Scale Ticks -->
        <g transform="translate(960, 540)">
          ${Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 6 - 90) * (Math.PI / 180);
            const r1 = i % 5 === 0 ? 280 : 295;
            const r2 = 305;
            return `<line x1="${Math.cos(angle) * r1}" y1="${Math.sin(angle) * r1}" x2="${Math.cos(angle) * r2}" y2="${Math.sin(angle) * r2}" stroke="${i % 5 === 0 ? '#38bdf8' : '#334155'}" stroke-width="${i % 5 === 0 ? '4' : '2'}"/>`;
          }).join('')}
        </g>
        <!-- Diegetic Number 10 -->
        <text x="960" y="585" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="180" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow)">10</text>
        <text x="960" y="650" font-family="sans-serif" font-size="20" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="10">BOOST PRESSURE • BAR x1.0</text>
        <text x="960" y="430" font-family="sans-serif" font-size="22" font-weight="800" fill="#94a3b8" text-anchor="middle" letter-spacing="12">${brand}</text>
        <!-- Telemetry Bottom Bar -->
        <rect x="800" y="700" width="320" height="30" rx="15" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
        <text x="960" y="721" font-family="monospace" font-size="13" font-weight="700" fill="#4285F4" text-anchor="middle" letter-spacing="4">TURBINE QUADRANT STAGE 10</text>
      </svg>`;

    case 9:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg9" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#241014"/>
            <stop offset="50%" stop-color="#120608"/>
            <stop offset="100%" stop-color="#050102"/>
          </radialGradient>
          <linearGradient id="redGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#EA4335"/>
            <stop offset="100%" stop-color="#ff6b6b"/>
          </linearGradient>
          <filter id="glow9">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg9)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#ff6b6b" opacity="0.35" filter="url(#glow9)"/>
        <!-- Robotic Arm Grid Overlay -->
        <g stroke="#33141a" stroke-width="1" opacity="0.6">
          ${Array.from({ length: 12 }).map((_, i) => `<line x1="${i * 160}" y1="0" x2="${i * 160}" y2="1080"/>`).join('')}
          ${Array.from({ length: 8 }).map((_, i) => `<line x1="0" y1="${i * 135}" x2="1920" y2="${i * 135}"/>`).join('')}
        </g>
        <!-- Robotic Calibrator Bezel -->
        <circle cx="960" cy="540" r="380" fill="none" stroke="#2d151a" stroke-width="30"/>
        <circle cx="960" cy="540" r="350" fill="#140608" stroke="#3b151d" stroke-width="6"/>
        <circle cx="960" cy="540" r="310" fill="none" stroke="url(#redGlow)" stroke-width="16" stroke-dasharray="1600 300" filter="url(#glow9)"/>
        <!-- Laser Crosshair -->
        <line x1="960" y1="200" x2="960" y2="880" stroke="#EA4335" stroke-width="2" stroke-dasharray="12 12" opacity="0.6"/>
        <line x1="620" y1="540" x2="1300" y2="540" stroke="#EA4335" stroke-width="2" stroke-dasharray="12 12" opacity="0.6"/>
        <!-- Diegetic Number 9 -->
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow9)">09</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#ff6b6b" text-anchor="middle" letter-spacing="10">ROBOTIC JOINT CALIBRATION</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#fca5a5" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 8:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg8" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#241e0c"/>
            <stop offset="50%" stop-color="#120e04"/>
            <stop offset="100%" stop-color="#050401"/>
          </radialGradient>
          <linearGradient id="amberGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FBBC04"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
          <filter id="glow8">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg8)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#f59e0b" opacity="0.35" filter="url(#glow8)"/>
        <!-- Manifold Rings -->
        <circle cx="960" cy="540" r="390" fill="none" stroke="#2c220c" stroke-width="24"/>
        <circle cx="960" cy="540" r="350" fill="#120d04" stroke="#453410" stroke-width="6"/>
        <circle cx="960" cy="540" r="310" fill="none" stroke="url(#amberGlow)" stroke-width="16" stroke-dasharray="1400 400" filter="url(#glow8)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow8)">08</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#FBBC04" text-anchor="middle" letter-spacing="10">CRYO PRESSURE • 8.0 MPa</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#fde68a" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 7:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg7" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#0c2014"/>
            <stop offset="50%" stop-color="#041208"/>
            <stop offset="100%" stop-color="#010603"/>
          </radialGradient>
          <linearGradient id="greenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#34A853"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
          <filter id="glow7">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg7)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#10b981" opacity="0.35" filter="url(#glow7)"/>
        <!-- LIDAR Scanner Radar Sweep -->
        <circle cx="960" cy="540" r="390" fill="none" stroke="#12331f" stroke-width="24"/>
        <circle cx="960" cy="540" r="350" fill="#04140a" stroke="#1b4d2e" stroke-width="6"/>
        <circle cx="960" cy="540" r="310" fill="none" stroke="url(#greenGlow)" stroke-width="16" stroke-dasharray="1300 500" filter="url(#glow7)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow7)">07</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#34A853" text-anchor="middle" letter-spacing="10">AUTONOMOUS LIDAR NAV • UNIT 07</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#a7f3d0" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 6:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg6" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#161830"/>
            <stop offset="50%" stop-color="#0a0c1a"/>
            <stop offset="100%" stop-color="#03040a"/>
          </radialGradient>
          <filter id="glow6">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg6)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#818cf8" opacity="0.35" filter="url(#glow6)"/>
        <circle cx="960" cy="540" r="380" fill="none" stroke="#252847" stroke-width="24"/>
        <circle cx="960" cy="540" r="340" fill="#0d0e1c" stroke="#373c6b" stroke-width="6"/>
        <circle cx="960" cy="540" r="300" fill="none" stroke="#6366f1" stroke-width="16" stroke-dasharray="1200 600" filter="url(#glow6)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow6)">06</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#818cf8" text-anchor="middle" letter-spacing="10">SPACECRAFT TELEMETRY STAGE 06</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#c7d2fe" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 5:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg5" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#1e1026"/>
            <stop offset="50%" stop-color="#0f0714"/>
            <stop offset="100%" stop-color="#050208"/>
          </radialGradient>
          <filter id="glow5">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg5)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#c084fc" opacity="0.35" filter="url(#glow5)"/>
        <circle cx="960" cy="540" r="380" fill="none" stroke="#331940" stroke-width="24"/>
        <circle cx="960" cy="540" r="340" fill="#13081a" stroke="#4c2660" stroke-width="6"/>
        <circle cx="960" cy="540" r="300" fill="none" stroke="#a855f7" stroke-width="16" stroke-dasharray="1100 700" filter="url(#glow5)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow5)">05</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#c084fc" text-anchor="middle" letter-spacing="10">FIBER-OPTIC ROUTING NODE 05</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#e9d5ff" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 4:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg4" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#241a0c"/>
            <stop offset="50%" stop-color="#120c04"/>
            <stop offset="100%" stop-color="#050301"/>
          </radialGradient>
          <filter id="glow4">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg4)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#fb923c" opacity="0.35" filter="url(#glow4)"/>
        <circle cx="960" cy="540" r="380" fill="none" stroke="#3b260d" stroke-width="24"/>
        <circle cx="960" cy="540" r="340" fill="#140b03" stroke="#5e3d15" stroke-width="6"/>
        <circle cx="960" cy="540" r="300" fill="none" stroke="#f97316" stroke-width="16" stroke-dasharray="1000 800" filter="url(#glow4)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow4)">04</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#fb923c" text-anchor="middle" letter-spacing="10">F1 STEERING WHEEL GEAR 4 • 314 KM/H</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#fed7aa" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 3:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg3" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#0c2024"/>
            <stop offset="50%" stop-color="#041114"/>
            <stop offset="100%" stop-color="#010507"/>
          </radialGradient>
          <filter id="glow3">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg3)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#22d3ee" opacity="0.35" filter="url(#glow3)"/>
        <circle cx="960" cy="540" r="380" fill="none" stroke="#12343b" stroke-width="24"/>
        <circle cx="960" cy="540" r="340" fill="#041214" stroke="#1b545f" stroke-width="6"/>
        <circle cx="960" cy="540" r="300" fill="none" stroke="#06b6d4" stroke-width="16" stroke-dasharray="900 900" filter="url(#glow3)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow3)">03</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#22d3ee" text-anchor="middle" letter-spacing="10">SUBMERSIBLE DEPTH GAUGE • LEVEL 03</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#a5f3fc" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 2:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg2" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#14182e"/>
            <stop offset="50%" stop-color="#080b17"/>
            <stop offset="100%" stop-color="#020308"/>
          </radialGradient>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg2)"/>
        <rect x="0" y="538" width="1920" height="4" fill="#38bdf8" opacity="0.35" filter="url(#glow2)"/>
        <circle cx="960" cy="540" r="380" fill="none" stroke="#1e2747" stroke-width="24"/>
        <circle cx="960" cy="540" r="340" fill="#080c1a" stroke="#2e3c6e" stroke-width="6"/>
        <circle cx="960" cy="540" r="300" fill="none" stroke="#0ea5e9" stroke-width="16" stroke-dasharray="800 1000" filter="url(#glow2)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="200" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow2)">02</text>
        <text x="960" y="665" font-family="sans-serif" font-size="20" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="10">HYPERSONIC SENSOR HUD • MACH 2.0</text>
        <text x="960" y="415" font-family="sans-serif" font-size="22" font-weight="800" fill="#bae6fd" text-anchor="middle" letter-spacing="12">${brand}</text>
      </svg>`;

    case 1:
    default:
      return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg1" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#2a0c10"/>
            <stop offset="50%" stop-color="#140406"/>
            <stop offset="100%" stop-color="#050102"/>
          </radialGradient>
          <linearGradient id="fireGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#EA4335"/>
            <stop offset="50%" stop-color="#FBBC04"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </linearGradient>
          <filter id="glow1">
            <feGaussianBlur stdDeviation="10" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1920" height="1080" fill="url(#bg1)"/>
        <rect x="0" y="538" width="1920" height="6" fill="#FBBC04" opacity="0.45" filter="url(#glow1)"/>
        <circle cx="960" cy="540" r="390" fill="none" stroke="#45141b" stroke-width="26"/>
        <circle cx="960" cy="540" r="350" fill="#1a0408" stroke="#6e1e2b" stroke-width="8"/>
        <circle cx="960" cy="540" r="310" fill="none" stroke="url(#fireGlow)" stroke-width="18" stroke-dasharray="1900 100" filter="url(#glow1)"/>
        <text x="960" y="590" font-family="'JetBrains Mono', 'Helvetica Neue', Arial, sans-serif" font-size="220" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow1)">01</text>
        <text x="960" y="670" font-family="sans-serif" font-size="22" font-weight="800" fill="#FBBC04" text-anchor="middle" letter-spacing="12">MASTER ENGINE IGNITION • CORE 01</text>
        <text x="960" y="410" font-family="sans-serif" font-size="24" font-weight="900" fill="#fecdd3" text-anchor="middle" letter-spacing="14">${brand}</text>
      </svg>`;
  }
}

export function renderDiegeticVisualFrame(slotIndex: number, outputPath: string, brandName: string): void {
  const svg = generateCinematicSceneSvg(slotIndex, brandName);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1920,
    },
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(outputPath, pngData);
}

// Retain compatibility export for legacy callers
export function renderDiegeticPPM(slotIndex: number, ppmPath: string, width: number = 1920, height: number = 1080): void {
  renderDiegeticVisualFrame(slotIndex, ppmPath.replace(/\.ppm$/, '.png'), 'Porsche Motorsport');
}
