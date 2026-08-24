export const UNIVERSAL_STYLE_ANCHOR =
  'Cinematic 8K, photorealistic, shot on 35mm anamorphic lens, shallow depth of field, natural atmospheric lighting, dynamic push-in zoom, highly detailed texture, hyper-realistic color grading, 16:9 aspect ratio.';

export interface DiegeticScenePlan {
  index: number;
  diegeticNumber: number;
  concept: string;
  objectEmbedding: string;
  revealMechanism: string;
  imagePrompt: string;
  videoPrompt: string;
}

/**
 * Builds the starting image prompt designed specifically for planning a subsequent video reveal.
 * The number is NOT prominent in the starting frame (hidden in shadows, behind occluders, or distant bokeh).
 * Enforces zero-hallucination framing (wide distant or macro close-up, no brand logos/wordmarks).
 */
export function buildRevealImagePrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  brandName: string,
  themeContext: string,
  customStyleAnchor: string = UNIVERSAL_STYLE_ANCHOR
): string {
  const brandContext = brandName ? `inspired by the world of ${brandName}` : '';
  const theme = themeContext ? `in an authentic setting of ${themeContext}` : '';

  return [
    `A cinematic wide establishing or macro close-up shot of ${concept} ${brandContext} ${theme}.`,
    `Atmospheric foreground framing, natural depth of field, and authentic environmental lighting.`,
    `The scene is specifically framed to conceal number '${number}', which is discreetly and physically integrated onto ${objectEmbedding} in the background or shadows, ready to be revealed through camera motion.`,
    `No prominent, floating, or obvious graphic numbers in view. No readable brand text, logos, or typography overlays on objects. Authentic physical materials and natural textures only.`,
    customStyleAnchor,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Builds the coordinated Veo 3 video motion prompt that dynamically reveals the number during the 4.0s shot.
 */
export function buildCoordinatedVideoPrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  revealMechanism: string,
  brandName: string
): string {
  const brandContext = brandName ? `in the world of ${brandName}` : '';
  return [
    `A 4-second cinematic camera move in ${concept} ${brandContext}.`,
    `${revealMechanism}, smoothly bringing the physically authentic, laser-etched, embossed, or illuminated diegetic number '${number}' on ${objectEmbedding} into sharp, crystal-clear focus.`,
    `60fps ultra-smooth cinematic motion, photorealistic lighting shifts, shallow depth of field transition, natural environmental textures. No artificial digital overlays or brand text.`,
  ]
    .filter(Boolean)
    .join(' ');
}

// Backward-compatible alias
export function buildDiegeticPrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  brandName: string,
  themeContext: string,
  customStyleAnchor: string = UNIVERSAL_STYLE_ANCHOR
): string {
  return buildRevealImagePrompt(number, concept, objectEmbedding, brandName, themeContext, customStyleAnchor);
}

export function buildMultimodalRefinePrompt(
  number: number,
  baseConcept: string,
  userNotes?: string
): string {
  const notes = userNotes ? `incorporating user feedback: "${userNotes}".` : '';
  return [
    `Seamlessly re-render the scene of ${baseConcept} ${notes}`,
    `Replace the product/asset with the authentic branded design provided in the reference image while keeping the exact environment lighting, 35mm anamorphic depth-of-field, and texture.`,
    `Preserve the subtle diegetic placement of number "${number}".`,
    UNIVERSAL_STYLE_ANCHOR,
  ]
    .filter(Boolean)
    .join(' ');
}
