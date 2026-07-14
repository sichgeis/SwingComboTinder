import { createHash } from "node:crypto";

export const DEFAULT_INSTRUCTIONS = `IMAGE 1 — STRICT POSE AND COMPOSITION REFERENCE

Preserve the exact dance pose shown in Image 1.

The following properties are hard constraints:

- exact joint positions and limb angles
- torso orientation and lean
- head direction
- weight-bearing leg
- foot placement and foot rotation
- hand positions and partner contact points
- distance, overlap, and relative scale between the dancers
- camera angle, framing, and perspective

Do not simplify, improve, reinterpret, mirror, or reverse the pose.

IMAGES 2–5 — STYLE REFERENCES ONLY

Apply the visual style shown in the style references, including:

- illustration technique
- line quality
- color palette
- shading
- background treatment
- clothing design language
- degree of facial abstraction

Do not copy poses or compositions from the style-reference images.

IDENTITY REPLACEMENT AND COMMUNITY REPRESENTATION

Completely replace the photographed people with fictional, non-identifiable dancers.

Do not preserve:

- faces or facial structure
- hairstyles
- apparent age
- tattoos
- body-specific identifying features
- clothing, logos, patterns, or accessories
- skin details from the original photograph

Represent the diversity of the Lindy Hop and swing dance community with care and authenticity. For each generated image, select the dancers from a varied range of racial and ethnic backgrounds, skin tones, body types, ages, gender identities, and gender expressions.

Do not assign dance roles according to gender. Lead and follow are dance roles, not gender roles, and any dancer may appear in either role.

Respect the African American origins and cultural heritage of Lindy Hop. The result should feel connected to the warmth, rhythm, individuality, joy, and social character of the dance without relying on stereotypes, caricatures, or exaggerated period imagery.

Allow representation to vary naturally across the full card deck rather than forcing every individual image to display every form of diversity.

OUTPUT

Create one clean instructional Lindy Hop dance-card illustration.

Show the full bodies of all dancers.

Preserve the exact teaching pose and make the body positions easy to understand.

Do not include text, labels, borders, additional people, additional limbs, distorted anatomy, or cropped feet.`;

export const MAX_GENERATION_NOTE_LENGTH = 500;

export const buildPrompt = (generationNote = ""): string => {
  const correction = generationNote.trim();
  if (!correction) return DEFAULT_INSTRUCTIONS;
  return `${DEFAULT_INSTRUCTIONS}

FIGURE-SPECIFIC CORRECTION

Apply this concise correction to the teaching pose while preserving every other instruction above:

${correction}`;
};

export const hashText = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
