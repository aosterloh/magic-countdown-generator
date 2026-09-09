# Veo 3.1 Prompt Generation Rules & Directorial Guidelines

This document defines the strict prompt engineering blueprint and directorial guidelines for generating 10-shot countdown video prompts for Google Veo 3.1. The backend dynamically reads this file on every prompt generation and refinement request.

---

## 1. 🚨 The 4-Pillar 360° Brand Narrative Architecture (Zero Monotony)

Prompts must never be repetitive (e.g. 10 identical factory or cleanroom shots). Every countdown sequence (10 down to 1) MUST distribute shots across these 4 distinct narrative pillars:

### Pillar 1: Innovation & High-Tech Craft (3 Shots: #10, #8, #1)
- **Shot #10 (Genesis / Advanced R&D Lab):** Core engineering, high-temperature crystallization furnaces, optical laser alignment, or cleanroom wafer bonding.
- **Shot #8 (Precision Manufacturing):** Automated multi-axis robotics, high-speed wire bonding, or aerospace chassis assembly.
- **Shot #1 (Grand Finale Masterpiece):** Iconic hero flagship emblem, finished microchip, or vehicle in dramatic golden architectural spotlight.

### Pillar 2: Workplace Culture & People (2 Shots: #9, #7)
- **Shot #9 (Campus Life & Coffee/Lunch Moments):** Modern sunlit architectural atrium cafeteria, campus espresso lounge, or garden courtyard. Show recognizable colleagues/engineers talking and smiling warmly over morning espresso with natural skin tones and soft-focus background coworkers.
- **Shot #7 (Collaborative Brainstorm Hub):** Glass-walled design studio or engineering workshop. Identifiable team members actively collaborating around a transparent glass whiteboard with circuit/topology diagrams.

### Pillar 3: Real-World In-Use & Customer Experience (3 Shots: #5, #4, #3)
- **Shot #5 (High-Performance In-Use):** The product operating in an extreme or dynamic real-world environment (e.g. high-performance EV accelerating on an alpine mountain pass, widebody jet banking over sunset cloudscapes).
- **Shot #4 (Everyday Customer Connection):** Real person/customer interacting with the product/service with a natural subtle smile (e.g. driver plugging in at an ultra-fast highway charging station, passenger boarding a private airline suite).
- **Shot #3 (Sustainable Scale & Infrastructure):** Renewable wind/solar energy grid, smart mobility network, or modern data center infrastructure.

### Pillar 4: Global Supply Chain & Operations (2 Shots: #6, #2)
- **Shot #6 (Global Logistics Beat Drop):** Autonomous container transport fleet or high-tech shipping terminal at golden dusk.
- **Shot #2 (Operations Command Center):** High-tech executive operations bridge or smart city telemetry control room overlooking an illuminated skyline at twilight.

---

## 2. 🚨 The 6 Supreme Directives for Veo 3.1 Prompt Synthesis

1. **POSITIVE-ONLY SCENE DESCRIPTIONS (0.0s–2.5s):**
   - NEVER use negative text instructions like "strictly zero numbers", "no text", "without digits", or "no overlays". Diffusion text encoders are degraded by negative phrasing.
   - Describe the initial 2.5 seconds purely through POSITIVE physical motion and ambient lighting.

2. **SINGLE TEXT TARGET (ISOLATE '[N]' ONLY):**
   - The ONLY text that should appear in quotes anywhere in the prompt is the exact single countdown number `'[N]'`.
   - NEVER include secondary words, step prefixes, or label text (e.g. NEVER write `'STEP 010'`, `'STAGE 9'`, `'ID: 8'`, or `'NO. 7'`). Only write `'[N]'`.

3. **PHYSICAL PRESENCE & HIGH-CONTRAST TONAL PAIRING (2.5s–4.0s):**
   - The numeral `'[N]'` must have tangible physical presence. Use tactile phrasing:
     * Glowing amber/gold luminescent traces on dark matte silicon.
     * Deeply laser-engraved polished brass on an espresso machine drip tray.
     * Vibrant neon orange dry-erase marker on transparent architectural glass.
     * Illuminated electric cyan digits on a curved digital cockpit OLED display.
     * High-visibility retroreflective safety white stenciled on cargo containers.
     * Polished industrial chrome embossed on heavy brushed copper/steel plates.

4. **CENTERED MACRO FRAMING DURING THE FINAL SECOND:**
   - In seconds 2.5s–4.0s, the camera must execute a rapid zoom/tilt or foreground object exit, locking directly onto the high-contrast numeral `'[N]'` centered in the frame in razor-sharp focus for the final second.

5. **MANDATORY NUMERAL VISIBILITY CLAUSE (ESSENTIAL):**
   - EVERY video prompt MUST conclude the reveal section with:
     > `"Essential requirement: the physical numeral '[N]' must be clearly visible, centered, and unmistakably rendered in frame."`

6. **CINEMATOGRAPHY SPECIFICATIONS:**
   - Always conclude with: `Cinematography: 35mm anamorphic lens, shallow/macro depth of field, volumetric rim lighting, natural skin tones, photorealistic textures, 60fps.`

---

## 3. 📝 Strict 3-Part Blueprint Format for 'videoPrompt'

```text
[0.0s-2.5s]: Dynamic wide cinematic camera tracking shot establishing [unique scene environment] for [Brand Name], focusing solely on [positive ambient movement, colleagues, or machinery]. [2.5s-4.0s]: [Camera rapidly zooms and macro-locks into center of carrier object OR foreground obstacle moves cleanly out of frame], revealing the bold high-contrast physical numeral '[N]' [tactile material finish] occupying the center of the frame in razor-sharp focus during the final second. Essential requirement: the physical numeral '[N]' must be clearly visible, centered, and unmistakably rendered in frame. Cinematography: 35mm anamorphic lens, shallow depth of field, volumetric rim lighting, photorealistic textures, 60fps.
```
