import { describe, it, expect } from 'vitest';
import {
  buildStartImagePrompt,
  buildEndImagePrompt,
  buildCoordinatedVideoPrompt,
  buildMultimodalRefinePrompt,
  adaptPromptNumerals,
  UNIVERSAL_STYLE_ANCHOR,
} from '../src/utils/promptBuilder';

describe('Prompt Builder & Coordinated Reveal Architecture', () => {
  it('builds grounded Frame 1 starting image prompt (clean establishing shot with ZERO numbers)', () => {
    const prompt = buildStartImagePrompt(
      10,
      'a sleek titanium intake manifold on a sports car engine',
      'compressor rotor housing',
      'Porsche',
      'Hyper-modern automotive laboratory'
    );

    expect(prompt).toContain('Porsche');
    expect(prompt).toContain('wide cinematic establishing shot');
    expect(prompt).toContain('No text, words, letters, numbers, digits, plaques, or graphic overlays in frame.');
    expect(prompt).toContain('Grounded subjects only: no frozen mid-air jumps');
    expect(prompt).toContain(UNIVERSAL_STYLE_ANCHOR);
  });

  it('builds hero Frame N ending image prompt with authentic countdown numeral in sharp center focus', () => {
    const prompt = buildEndImagePrompt(
      10,
      'a sleek titanium intake manifold on a sports car engine',
      'compressor rotor housing',
      'Porsche',
      'Hyper-modern automotive laboratory'
    );

    expect(prompt).toContain('Porsche');
    expect(prompt).toContain('tight cinematic hero shot');
    expect(prompt).toContain("The physical countdown numeral '10' is authentically crafted");
    expect(prompt).toContain('large, razor-sharp, crystal-clear center focus');
    expect(prompt).toContain(UNIVERSAL_STYLE_ANCHOR);
  });

  it('builds front-loaded Veo 3 camera motion prompt with unpadded numeral', () => {
    const videoPrompt = buildCoordinatedVideoPrompt(
      10,
      'titanium intake manifold',
      'compressor rotor housing',
      'dynamic push-in camera motion',
      'Porsche'
    );

    expect(videoPrompt).toContain('Silent 4-second clip revealing the number "10"');
    expect(videoPrompt).toContain('titanium intake manifold for Porsche');
    expect(videoPrompt).toContain('compressor rotor housing');
    expect(videoPrompt).toContain('dynamic push-in camera motion');
    expect(videoPrompt).toContain('physical numeral "10"');
  });

  it('builds multimodal refinement prompt preserving subtle diegetic placement', () => {
    const refinePrompt = buildMultimodalRefinePrompt(
      7,
      'aviation engine turbine blade',
      'ensure Boeing logo is centered'
    );

    expect(refinePrompt).toContain('aviation engine turbine blade');
    expect(refinePrompt).toContain('Boeing logo is centered');
    expect(refinePrompt).toContain('Preserve the subtle diegetic placement of number "7"');
  });

  it('intelligently adapts prompt numerals when prompt is moved from position 8 to position 10', () => {
    const originalImagePrompt =
      "A cinematic shot of padel center court. The scene is specifically framed to conceal number '8', which is discreetly and physically integrated onto painted blue court baseline identifier 'COURT 8'. Cinematic 8K, photorealistic, shot on 35mm lens, 1080p, 60fps.";
    const originalVideoPrompt =
      "Camera tilts down in 4-second motion to reveal diegetic number '8' on the padel ball package eight.";

    const adaptedImage = adaptPromptNumerals(originalImagePrompt, 8, 10);
    const adaptedVideo = adaptPromptNumerals(originalVideoPrompt, 8, 10);

    expect(adaptedImage).toContain("conceal number '10'");
    expect(adaptedImage).toContain("COURT 10");
    // Technical tokens preserved
    expect(adaptedImage).toContain("Cinematic 8K");
    expect(adaptedImage).toContain("35mm lens");
    expect(adaptedImage).toContain("1080p");
    expect(adaptedImage).toContain("60fps");

    expect(adaptedVideo).toContain("diegetic number '10'");
    expect(adaptedVideo).toContain("package ten");
    expect(adaptedVideo).toContain("4-second motion");
  });
});
