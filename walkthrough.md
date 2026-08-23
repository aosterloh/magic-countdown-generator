# Walkthrough: CountdownMaker (EGM Phase G3 Target-Driven Execution)

The **CountdownMaker** application has been built and verified in clean-room execution conforming strictly to [`specifications/spec_v3.html`](file:///Users/aosterloh/Dev/CountdownMaker/specifications/spec_v3.html).

---

## 🚀 Live Servers & Access
- **Frontend UI:** `http://localhost:5173`
- **Backend API & ffmpeg Service:** `http://localhost:3001`
- **Audio Track Grounding:** [`public/countdown/countdown_track.mp3`](file:///Users/aosterloh/Dev/CountdownMaker/public/countdown/countdown_track.mp3)

---

## 🧩 Architectural Implementation Summary

### 1. Diegetic Scene & Universal Style Synthesizer
- Generates 10 sequential shots ($10 \to 1$) embedding physical numbers into authentic objects (gauges, titanium plates, digital OLEDs, turbine dials) with zero floating overlays.
- Standardized with the invariant visual anchor:
  > *"Cinematic 8K, photorealistic, shot on 35mm anamorphic lens, shallow depth of field, natural atmospheric lighting, dynamic push-in zoom, highly detailed texture, hyper-realistic color grading, 16:9 aspect ratio."*

### 2. Shot Review & Refinement Protocol (Step 2b)
- **1-Click Accept (Default) & Redo:** Quick regeneration per slot.
- **Dual-Image Multimodal Refinement Modal:** Ingests the current target frame along with a 2nd brand asset image (e.g. customer vehicle, aircraft, or logo) and prompt notes to replace products seamlessly.
- **Rollback Stack ($N-1$):** Reverts any slot back to its previous generation if a redo is worse than the original.

### 3. Veo 3 Video Generator (Step 3)
- Generates 4.0-second video clips with dynamic 35mm push-in camera motion into each physical diegetic number.

### 4. Interactive Audio Waveform Timeline & Temporal Alignment (Step 4)
- **Waveform Canvas:** Decodes and renders the 30-second soundtrack waveform.
- **Multi-Track Clip Blocks:** 10 color-coded segment blocks showing exact cut boundaries relative to song beats.
- **Sub-Second Precision Slider ($0.5\text{s} \to 4.0\text{s}$):**
  - **Speed-Up ($1.33\times$):** `setpts=0.75*PTS`
  - **Untouched Passthrough ($4.0\text{s}$)**
  - **Truncate Front ($[1.0\text{s}\text{--}4.0\text{s}]$):** Keeps climax/zoom end.
  - **Truncate Back ($[0.0\text{s}\text{--}3.0\text{s}]$):** Keeps opening context.
- **Master Scrubbing Synchronization:** Single-viewport master player maps playhead seek time directly to the active slot frame ($t_{\text{playhead}} \to \text{Slot } k$).

### 5. Native Backend ffmpeg Concat Engine (Step 5)
- Executes native system ffmpeg on the Node.js backend.
- Concurrently normalizes all clips to `1920x1080 @ 30fps, yuv420p`.
- Stitches the 10 transformed clips with `public/countdown/countdown_track.mp3` with deterministic audio padding (`apad` when $T \ge 30\text{s}$) or audio fading (`afade` when $T < 30\text{s}$).

---

## 🧪 Verification & Automated Test Results

All 13 automated tests passed:

```bash
 ✓ tests/prompt_builder.test.ts (2 tests)
 ✓ tests/temporal_math.test.ts (7 tests)
 ✓ tests/ffmpeg_builder.test.ts (4 tests)

 Test Files  3 passed (3)
      Tests  13 passed (13)
```

End-to-end master export verified:
- **Output:** [`output/master_countdown_1787392554971.mp4`](file:///Users/aosterloh/Dev/CountdownMaker/output/master_countdown_1787392554971.mp4)
- **Duration:** Exactly $30.00\text{s}$ synchronized with `countdown_track.mp3`.
