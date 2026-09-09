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
 * Builds the starting image prompt (Frame 1 Setup).
 * Wide, grounded cinematic establishing shot of the environment with ZERO numbers, text, or graphic overlays.
 */
export function buildStartImagePrompt(
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
    `A wide cinematic establishing shot of ${concept} ${brandContext} ${theme}.`,
    `Atmospheric composition with deep scenic perspective, natural environmental lighting, authentic architectural materials, and rich textures.`,
    `Clean scenic environment establishing the initial camera view before movement. No text, words, letters, numbers, digits, plaques, or graphic overlays in frame.`,
    `Grounded subjects only: no frozen mid-air jumps, no floating bodies in mid-motion.`,
    customStyleAnchor,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Builds the ending hero image prompt (Frame N / Frame 120 Setup).
 * Tight cinematic hero shot focused directly on the carrier object with the countdown numeral
 * rendered in large, razor-sharp, crystal-clear center focus.
 */
export function buildEndImagePrompt(
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
    `A tight cinematic hero shot focused on ${objectEmbedding} in ${concept} ${brandContext} ${theme}.`,
    `The physical countdown numeral '${number}' is authentically crafted, painted, stamped, engraved, or illuminated directly on the surface of ${objectEmbedding} in large, razor-sharp, crystal-clear center focus as the definitive hero focal point.`,
    `Macro texture details, natural lighting, deep depth of field, and authentic physical materials matching the environment.`,
    `No frozen mid-air acrobatic poses, no artificial floating graphics, no corporate brand logos.`,
    customStyleAnchor,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Builds the coordinated Veo 3 video motion prompt that seamlessly transitions
 * from the wide establishing Frame 1 to the final hero Frame N with the countdown numeral.
 */
export function buildCoordinatedVideoPrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  revealMechanism: string,
  brandName: string
): string {
  const brandContext = brandName && !concept.toLowerCase().includes(brandName.toLowerCase()) ? ` for ${brandName}` : '';
  const cleanCarrier = objectEmbedding ? objectEmbedding.replace(/['"]/g, '') : 'carrier surface';
  let cleanMotion = 'a smooth, deliberate push-in zoom';
  if (revealMechanism) {
    cleanMotion = revealMechanism
      .replace(/^the camera executes\s+/i, '')
      .replace(/^camera executes\s+/i, '')
      .replace(/^the camera\s+/i, '')
      .replace(/^camera\s+/i, '')
      .trim();
  }

  return `Silent 4-second clip revealing the number "${number}". Wide atmospheric shot establishing ${concept}${brandContext}. The camera executes a smooth push-in zoom ${cleanMotion.toLowerCase().startsWith('rapidly') || cleanMotion.toLowerCase().startsWith('smoothly') || cleanMotion.toLowerCase().startsWith('slowly') || cleanMotion.toLowerCase().startsWith('tracking') ? cleanMotion : `focusing on ${cleanMotion}`} toward the ${cleanCarrier}, locking focus sharply onto the crisp, high-contrast physical numeral "${number}".`;
}

// Backward-compatible alias
export function buildRevealImagePrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  brandName: string,
  themeContext: string,
  customStyleAnchor: string = UNIVERSAL_STYLE_ANCHOR
): string {
  return buildStartImagePrompt(number, concept, objectEmbedding, brandName, themeContext, customStyleAnchor);
}

export function buildDiegeticPrompt(
  number: number,
  concept: string,
  objectEmbedding: string,
  brandName: string,
  themeContext: string,
  customStyleAnchor: string = UNIVERSAL_STYLE_ANCHOR
): string {
  return buildStartImagePrompt(number, concept, objectEmbedding, brandName, themeContext, customStyleAnchor);
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

const NUMBER_WORDS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
};

const ORDINAL_WORDS: Record<number, string> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
  9: 'ninth',
  10: 'tenth',
};

/**
 * Intelligently adapts prompt text when a prompt is moved from one countdown slot to another.
 * Swaps old countdown numbers (digits and words) with the new target number, while strictly preserving
 * technical resolution tokens like 8K, 4K, 1080p, 60fps, 35mm, 4.0s.
 */
export function adaptPromptNumerals(text: string, oldNum: number, newNum: number): string {
  if (!text || oldNum === newNum) return text;

  let result = text;
  const oldPadded = oldNum < 10 ? `0${oldNum}` : `${oldNum}`;

  // 1. Quoted numerals: '8', "8", '08', "08"
  result = result.replace(new RegExp(`(['"])(${oldNum}|${oldPadded})(['"])`, 'g'), `$1${newNum}$3`);

  // 2. Hash notation: #8, #08
  result = result.replace(new RegExp(`(#)(${oldNum}|${oldPadded})\\b`, 'g'), `$1${newNum}`);

  // 3. Explicit keywords + numeral: number 8, numeral 8, digit 8, countdown 8, shot 8, court 8, etc.
  const keywordPattern = `\\b(number|numeral|digit|countdown|shot|scene|court|bay|gate|car|track|seat|row|door|locker|tag|ball|table|room|lane|hanger|pier|dock|terminal|booth|stage|box|pod|stand|station|marker|target|flag|jersey|shirt|helmet|engine|paddock|cockpit|gauge|meter|dial|timer|level)\\s+(['"]?)(${oldNum}|${oldPadded})\\b`;
  result = result.replace(new RegExp(keywordPattern, 'gi'), (match, keyword, quote) => {
    return `${keyword} ${quote}${newNum}`;
  });

  // 4. Word replacements: eight -> ten, eighth -> tenth (case-preserving)
  const oldWord = NUMBER_WORDS[oldNum];
  const newWord = NUMBER_WORDS[newNum];
  if (oldWord && newWord) {
    // lowercase
    result = result.replace(new RegExp(`\\b${oldWord}\\b`, 'g'), newWord);
    // Capitalized (e.g. Eight -> Ten)
    const oldCap = oldWord.charAt(0).toUpperCase() + oldWord.slice(1);
    const newCap = newWord.charAt(0).toUpperCase() + newWord.slice(1);
    result = result.replace(new RegExp(`\\b${oldCap}\\b`, 'g'), newCap);
    // UPPERCASE (e.g. EIGHT -> TEN)
    const oldUpper = oldWord.toUpperCase();
    const newUpper = newWord.toUpperCase();
    result = result.replace(new RegExp(`\\b${oldUpper}\\b`, 'g'), newUpper);
  }

  const oldOrd = ORDINAL_WORDS[oldNum];
  const newOrd = ORDINAL_WORDS[newNum];
  if (oldOrd && newOrd) {
    result = result.replace(new RegExp(`\\b${oldOrd}\\b`, 'g'), newOrd);
    const oldOrdCap = oldOrd.charAt(0).toUpperCase() + oldOrd.slice(1);
    const newOrdCap = newOrd.charAt(0).toUpperCase() + newOrd.slice(1);
    result = result.replace(new RegExp(`\\b${oldOrdCap}\\b`, 'g'), newOrdCap);
    const oldOrdUpper = oldOrd.toUpperCase();
    const newOrdUpper = newOrd.toUpperCase();
    result = result.replace(new RegExp(`\\b${oldOrdUpper}\\b`, 'g'), newOrdUpper);
  }

  return result;
}
