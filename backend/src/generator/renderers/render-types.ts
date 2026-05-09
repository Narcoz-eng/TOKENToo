import type { GeneratedStyleProfile, PreviewAssetPlan, RenderingEngineName, VisualDesignSystem, VisualRarityFrame } from "../generator.types";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
export type PreviewMode = "avatar" | "banner" | "nft";

export type RenderPalette = {
  primary: string;
  secondary: string;
  ink: string;
  accent: string;
  paper: string;
};

export type RenderMood = {
  name: string;
  expression: string;
  eyeLanguage: string;
  mouthLanguage: string;
  stance: string;
  gesture: string;
  auraBehavior: string;
  animationState: string;
};

export type RenderContext = {
  style: GeneratedStyleProfile;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  seed: number;
  mode: PreviewMode;
  rarity: Rarity;
  intensity: number;
  family: VisualDesignSystem["rendererFamily"];
  engine: RenderingEngineName;
  visual: VisualDesignSystem;
  frame: VisualRarityFrame;
  mood: RenderMood;
  palette: RenderPalette;
  traits?: Record<string, unknown>;
};

export type RenderSignature = {
  rendererPipeline: string;
  layoutFamily: string;
  compositionCode: string;
  cameraVariant: string;
  faceVariant: string;
  eyeVariant: string;
  mouthVariant: string;
  silhouetteVariant: string;
  postureVariant: string;
  lightingVariant: string;
  environmentVariant: string;
  eventFrame: string;
  animationCue: string;
  renderFingerprint: string;
};

export type RenderResult = {
  svg: string;
  signature: RenderSignature;
};

export type PreviewRenderer = {
  pipeline: string;
  families: VisualDesignSystem["rendererFamily"][];
  engines: RenderingEngineName[];
  render(ctx: RenderContext): RenderResult;
};

export type PreviewRenderRequest = {
  style: GeneratedStyleProfile;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  seed: number;
  mode: PreviewMode;
  rarity: Rarity;
  traits?: Record<string, unknown>;
};

export const rarityLadder: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

export function previewAssetType(mode: PreviewMode): PreviewAssetPlan["type"] {
  if (mode === "avatar") return "AVATAR";
  if (mode === "banner") return "BANNER";
  return "SAMPLE_NFT";
}
