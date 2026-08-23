export const UNIVERSAL_STYLE_ANCHOR =
  'Cinematic 8K, photorealistic, shot on 35mm anamorphic lens, shallow depth of field, natural atmospheric lighting, dynamic push-in zoom, highly detailed texture, hyper-realistic color grading, 16:9 aspect ratio.';

export interface DiegeticScenePlan {
  index: number;
  diegeticNumber: number;
  concept: string;
  objectEmbedding: string;
  cameraMovement: string;
  fullImagePrompt: string;
}

export function buildDiegeticPrompt(
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
    `A cinematic close-up of ${concept} ${brandContext} ${theme}.`,
    `The number "${number}" is physically engraved, illuminated, embossed, or stamped directly onto the ${objectEmbedding} as an authentic, diegetic part of the physical object with realistic wear and reflections.`,
    `No artificial or floating graphic overlays.`,
    customStyleAnchor,
  ]
    .filter(Boolean)
    .join(' ');
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
    `Ensure the number "${number}" remains clearly visible and physically integrated onto the primary object.`,
    UNIVERSAL_STYLE_ANCHOR,
  ]
    .filter(Boolean)
    .join(' ');
}
