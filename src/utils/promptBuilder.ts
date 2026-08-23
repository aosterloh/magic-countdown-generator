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
 */
export function buildRevealImagePrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  brandName: string,
  themeContext: string,
  customStyleAnchor: string = UNIVERSAL_STYLE_ANCHOR
): string {
  const brandContext = brandName ? `for ${brandName}` : '';
  const theme = themeContext ? `in a setting of ${themeContext}` : '';

  return [
    `A cinematic wide/medium shot establishing ${concept} ${brandContext} ${theme}.`,
    `Atmospheric foreground machinery, natural bokeh, and dramatic shadows conceal the deep inner casing.`,
    `The scene is specifically framed to conceal number '${number}', which is discreetly stamped or laser-engraved onto ${objectEmbedding} deep within the background shadows, ready to be revealed through camera motion.`,
    `No prominent, floating, or obvious graphic numbers in view. Authentic diegetic textures, realistic metal reflections, volumetric dust particles.`,
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
  const brandContext = brandName ? `for ${brandName}` : '';
  return [
    `A 4-second cinematic camera move in ${concept} ${brandContext}.`,
    `${revealMechanism}, smoothly bringing the physically authentic, laser-etched or illuminated diegetic number '${number}' on ${objectEmbedding} into sharp, crystal-clear focus.`,
    `60fps ultra-smooth cinematic motion, photorealistic lighting shifts, shallow depth of field transition, highly detailed mechanical textures.`,
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
