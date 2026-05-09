import { Injectable } from "@nestjs/common";
import type { PreviewAssetPlan } from "./generator.types";

const famousIpPattern = /\b(bayc|bored\s*ape|degods?|mad\s*lads?|solana\s*monkey|smb|cryptopunks?|azuki)\b/i;

@Injectable()
export class AiOutputQualityValidatorService {
  validate(previews: PreviewAssetPlan[]) {
    const ai = previews.filter((asset) => asset.productionAssetStatus === "AI_CONCEPT");
    const issues: string[] = [];
    if (!ai.length) return issues;
    if (ai.some((asset) => asset.uri.startsWith("data:image/svg+xml"))) issues.push("AI concept pipeline returned SVG or placeholder output.");
    if (ai.some((asset) => famousIpPattern.test(JSON.stringify(asset.generationMetadata ?? {})))) issues.push("AI concept prompt references famous NFT IP.");
    for (const type of ["BANNER"]) {
      if (!ai.some((asset) => asset.type === type)) issues.push(`AI concept set is missing ${type.toLowerCase()} output.`);
    }
    if (!ai.some((asset) => asset.type === "SAMPLE_NFT")) issues.push("AI concept set is missing rarity character outputs.");
    const rarities = ai.filter((asset) => asset.type === "SAMPLE_NFT").map((asset) => String(asset.metadata.rarity));
    for (const rarity of ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]) {
      if (!rarities.includes(rarity)) issues.push(`AI concept set is missing ${rarity} rarity exemplar.`);
    }
    const promptTexts = ai.map((asset) => String(asset.generationMetadata?.prompt ?? ""));
    const samplePromptTexts = ai.filter((asset) => asset.type === "SAMPLE_NFT").map((asset) => String(asset.generationMetadata?.prompt ?? ""));
    if (promptTexts.some((prompt) => /Dominant creative signals|Object anchors|World anchors|Trait taxonomy|semantic weights|metadata transformed/i.test(prompt))) issues.push("AI concept prompts expose internal metadata/taxonomy language.");
    if (promptTexts.some((prompt) => !/Civilization:|Faction culture:|Mood signature:|Meme-native personality:/i.test(prompt))) issues.push("AI concept prompts do not author a civilization-level identity.");
    if (promptTexts.some((prompt) => !/Camera angle:|Lens style:|Framing:|Lighting mood:|Environmental storytelling:|Composition focus:|Silhouette emphasis:/i.test(prompt))) issues.push("AI concept prompts are missing cinematic direction.");
    if (samplePromptTexts.some((prompt) => !/Face direction: eyes|mouth|posture|gesture|clothing|FX|color grade|camera shake|scene chaos/i.test(prompt))) issues.push("AI concept prompts do not connect mood to face, body, wardrobe, FX, environment, and camera.");
    if (promptTexts.some((prompt) => !/placeholder cards|abstract boxes|wireframe diagrams/i.test(prompt))) issues.push("AI concept prompts do not explicitly reject placeholder/wireframe visual language.");
    if (promptTexts.some((prompt) => !/visible emotion and body language/i.test(prompt))) issues.push("AI concept prompts do not require visible emotional acting.");
    if (promptTexts.some((prompt) => !/generic mascot poses|flat trading-card composition|mobile game ad|low-effort AI|silhouette clarity|face readability|cinematic hierarchy/i.test(prompt))) issues.push("AI concept prompts do not enforce the concept polish bar.");
    const samePoseCount = samplePromptTexts.filter((prompt) => !/different pose|unique pose|new camera|one-of-one|scene-level|near-one/i.test(prompt)).length;
    if (samePoseCount > 2) issues.push("AI rarity prompts do not force enough pose and composition variation.");
    const legendary = ai.find((asset) => asset.metadata.rarity === "Legendary");
    const mythic = ai.find((asset) => asset.metadata.rarity === "Mythic");
    if (legendary && !/cinematic scene-level/i.test(String(legendary.generationMetadata?.prompt ?? ""))) issues.push("Legendary AI concept prompt is not cinematic enough.");
    if (mythic && !/near-one-of-one|unique composition/i.test(String(mythic.generationMetadata?.prompt ?? ""))) issues.push("Mythic AI concept prompt is not unique enough.");
    return issues;
  }
}
