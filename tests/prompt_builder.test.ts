import { describe, it, expect } from 'vitest';
import {
  buildRevealImagePrompt,
  buildCoordinatedVideoPrompt,
  buildMultimodalRefinePrompt,
  UNIVERSAL_STYLE_ANCHOR,
} from '../src/utils/promptBuilder';

describe('Prompt Builder & Coordinated Reveal Architecture', () => {
  it('builds starting image prompt specifically planning for subsequent video reveal', () => {
    const prompt = buildRevealImagePrompt(
      10,
      'a sleek titanium intake manifold on a sports car engine',
      'compressor rotor housing',
      'Porsche',
      'Hyper-modern automotive laboratory'
    );

    expect(prompt).toContain('Porsche');
    expect(prompt).toContain('compressor rotor housing');
    expect(prompt).toContain("specifically framed to conceal number '10'");
    expect(prompt).toContain('No prominent, floating, or obvious graphic numbers');
    expect(prompt).toContain(UNIVERSAL_STYLE_ANCHOR);
  });

  it('builds coordinated Veo 3 camera motion prompt that dynamically reveals the number', () => {
    const videoPrompt = buildCoordinatedVideoPrompt(
      10,
      'titanium intake manifold',
      'compressor rotor housing',
      'Camera pushes past foreground carbon fiber guide vanes',
      'Porsche'
    );

    expect(videoPrompt).toContain('Porsche');
    expect(videoPrompt).toContain('Camera pushes past foreground carbon fiber guide vanes');
    expect(videoPrompt).toContain("diegetic number '10'");
    expect(videoPrompt).toContain('60fps ultra-smooth cinematic motion');
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
    expect(refinePrompt).toContain(UNIVERSAL_STYLE_ANCHOR);
  });
});
