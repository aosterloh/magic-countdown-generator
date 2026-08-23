import { describe, it, expect } from 'vitest';
import {
  buildDiegeticPrompt,
  buildMultimodalRefinePrompt,
  UNIVERSAL_STYLE_ANCHOR,
} from '../src/utils/promptBuilder';

describe('Prompt Builder & Universal Aesthetic Invariants', () => {
  it('builds diegetic prompt containing physical number embedding and style anchor', () => {
    const prompt = buildDiegeticPrompt(
      10,
      'a sleek illuminated digital gauge on a sports car dashboard',
      'center speedometer dial',
      'Porsche',
      'Hyper-modern automotive laboratory'
    );

    expect(prompt).toContain('Porsche');
    expect(prompt).toContain('number "10" is physically engraved, illuminated');
    expect(prompt).toContain('center speedometer dial');
    expect(prompt).toContain('No artificial or floating graphic overlays');
    expect(prompt).toContain(UNIVERSAL_STYLE_ANCHOR);
  });

  it('builds multimodal refinement prompt with reference asset grounding', () => {
    const refinePrompt = buildMultimodalRefinePrompt(
      7,
      'aviation engine turbine blade',
      'ensure Boeing logo is centered'
    );

    expect(refinePrompt).toContain('aviation engine turbine blade');
    expect(refinePrompt).toContain('Boeing logo is centered');
    expect(refinePrompt).toContain('number "7" remains clearly visible');
    expect(refinePrompt).toContain(UNIVERSAL_STYLE_ANCHOR);
  });
});
