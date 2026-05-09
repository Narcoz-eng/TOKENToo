import type { RenderContext, RenderPalette, RenderSignature } from "./render-types";

export function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

export function svgUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mod(seed: number, salt: number, max: number) {
  return Math.abs((seed * 9301 + salt * 49297) % 233280) % max;
}

export function jitter(seed: number, salt: number, range: number) {
  return mod(seed, salt, range * 2 + 1) - range;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function defs(ctx: RenderContext) {
  const { primary, secondary, accent, ink } = ctx.palette;
  return `<defs>
    <filter id="softShadow"><feDropShadow dx="0" dy="${ctx.intensity >= 5 ? 14 : 8}" stdDeviation="${ctx.intensity >= 5 ? 18 : 8}" flood-color="#000" flood-opacity="0.42"/></filter>
    <filter id="roughPaper"><feTurbulence type="fractalNoise" baseFrequency="${ctx.family === "propaganda-poster" ? 0.16 : 0.72}" numOctaves="4" seed="${ctx.seed % 997}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.18"/></feComponentTransfer></filter>
    <linearGradient id="keyLight" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="0.48" stop-color="${secondary}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
    <radialGradient id="eventGlow" cx="45%" cy="28%" r="72%"><stop stop-color="${accent}" stop-opacity="0.9"/><stop offset="0.48" stop-color="${primary}" stop-opacity="0.32"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></radialGradient>
  </defs>`;
}

export function wrapSvg(ctx: RenderContext, body: string, signature: RenderSignature) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ctx.width}" height="${ctx.height}" viewBox="0 0 ${ctx.width} ${ctx.height}" data-engine="${ctx.engine}" data-rarity="${ctx.rarity}" data-pipeline="${signature.rendererPipeline}" data-composition="${signature.compositionCode}">
  ${defs(ctx)}
  ${body}
</svg>`;
}

export function labelLayer(ctx: RenderContext, color = "#fff", secondary = ctx.palette.primary) {
  if (ctx.mode === "avatar") return "";
  const title = escapeXml(ctx.title).slice(0, ctx.mode === "banner" ? 72 : 44);
  const sub = escapeXml(ctx.subtitle).slice(0, 76);
  const y = ctx.mode === "banner" ? ctx.height - 92 : ctx.height - 64;
  const font = ctx.family === "terminal-brutalist" || ctx.family === "pixel-topdown" || ctx.family === "retro-arcade" ? "ui-monospace, Consolas, monospace" : "Inter, Arial, sans-serif";
  return `<g font-family="${font}">
    <text x="42" y="${y}" fill="${color}" font-size="${ctx.mode === "banner" ? 44 : 24}" font-weight="900">${title}</text>
    <text x="42" y="${y + 28}" fill="${secondary}" font-size="13" font-weight="800">${sub}</text>
  </g>`;
}

export function paletteFrom(colors: string[]): RenderPalette {
  return {
    primary: colors[0] ?? "#79f2ff",
    secondary: colors[1] ?? "#28356f",
    ink: colors[2] ?? "#050712",
    accent: colors[3] ?? "#f4f7fb",
    paper: colors[4] ?? "#f7f2df"
  };
}

export function moodPose(ctx: RenderContext) {
  const text = `${ctx.mood.name} ${ctx.mood.expression} ${ctx.mood.stance} ${ctx.frame.bodyLanguage}`.toLowerCase();
  const panic = /panic|rage|breach|chaos|shout|collapse|infection|hurt|error/.test(text);
  const calm = /calm|sleep|zen|quiet|deadpan|empty/.test(text);
  return {
    tilt: panic ? 16 + ctx.intensity * 3 : calm ? -5 : 6 + ctx.intensity,
    eyeScale: panic ? 1.45 : calm ? 0.58 : 1,
    mouthOpen: panic || /open|shout|transformed|event/.test(ctx.frame.faceTreatment.toLowerCase()),
    lean: panic ? -34 - ctx.intensity * 8 : calm ? 14 : 22,
    asymmetry: panic ? 42 : calm ? 12 : 24,
    energy: panic ? "volatile" : calm ? "withdrawn" : "focused"
  };
}

export function signature(ctx: RenderContext, pipeline: string, layoutFamily: string, compositionCode: string, details: Partial<RenderSignature> = {}): RenderSignature {
  const mood = moodPose(ctx);
  const cameraVariant = details.cameraVariant ?? `${layoutFamily}:${ctx.rarity}:${ctx.frame.camera}`;
  const faceVariant = details.faceVariant ?? `${mood.energy}:${ctx.rarity}:${ctx.frame.faceTreatment}`;
  const silhouetteVariant = details.silhouetteVariant ?? `${layoutFamily}:${ctx.rarity}:${ctx.frame.silhouetteMutation}`;
  const eventFrame = details.eventFrame ?? ctx.frame.event;
  const renderFingerprint = [
    pipeline,
    layoutFamily,
    compositionCode,
    cameraVariant,
    faceVariant,
    silhouetteVariant,
    eventFrame
  ].join("|");
  return {
    rendererPipeline: pipeline,
    layoutFamily,
    compositionCode,
    cameraVariant,
    faceVariant,
    eyeVariant: details.eyeVariant ?? `${ctx.rarity.toLowerCase()} ${mood.energy} eyes / ${ctx.mood.eyeLanguage}`,
    mouthVariant: details.mouthVariant ?? `${ctx.rarity.toLowerCase()} ${mood.mouthOpen ? "open" : "held"} mouth / ${ctx.mood.mouthLanguage}`,
    silhouetteVariant,
    postureVariant: details.postureVariant ?? `${mood.energy} posture / ${ctx.mood.stance}`,
    lightingVariant: details.lightingVariant ?? ctx.frame.lighting,
    environmentVariant: details.environmentVariant ?? ctx.frame.environment,
    eventFrame,
    animationCue: details.animationCue ?? ctx.frame.animationCue,
    renderFingerprint
  };
}

export function sceneIntensity(ctx: RenderContext) {
  if (ctx.rarity === "Mythic") return "mythic";
  if (ctx.rarity === "Legendary") return "legendary";
  if (ctx.rarity === "Epic") return "epic";
  return "standard";
}
