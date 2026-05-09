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
    const rarities = ai.filter((asset) => asset.type === "SAMPLE_NFT").map((asset) => String(asset.metadata.rarity));
    for (const rarity of ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]) {
      if (!rarities.includes(rarity)) issues.push(`AI concept set is missing ${rarity} rarity exemplar.`);
    }
    const promptTexts = ai.map((asset) => String(asset.generationMetadata?.prompt ?? ""));
    const samePoseCount = promptTexts.filter((prompt) => !/different pose|unique pose|new camera|one-of-one|scene-level|near-one/i.test(prompt)).length;
    if (samePoseCount > 2) issues.push("AI rarity prompts do not force enough pose and composition variation.");
    const legendary = ai.find((asset) => asset.metadata.rarity === "Legendary");
    const mythic = ai.find((asset) => asset.metadata.rarity === "Mythic");
    if (legendary && !/cinematic scene-level/i.test(String(legendary.generationMetadata?.prompt ?? ""))) issues.push("Legendary AI concept prompt is not cinematic enough.");
    if (mythic && !/near-one-of-one|unique composition/i.test(String(mythic.generationMetadata?.prompt ?? ""))) issues.push("Mythic AI concept prompt is not unique enough.");
    return issues;
  }
}
