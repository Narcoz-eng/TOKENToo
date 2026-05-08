# Generator Quality Model

TOKENToo generation is CA-first. The creator only needs to enter the Solana mint address. Helius token metadata, off-chain metadata, logo/image, name, symbol, description, extensions, and social-link presence become the primary identity source. Manual name, symbol, description, and logo fields are optional overrides and are recorded as overrides.

## Identity Model

Each generated collection stores Brand DNA and generated Creative DNA:

- token source summary and override flags
- logo-derived palette and collection color system
- extracted signal profile: entities, objects, animals, emotions, colors, visual shapes, meme language, cultural words, cue weights, and world/style references
- generated art style, world concept, mascot or subject, camera framing, palette, texture language, and base silhouette rules
- generated visual design system: body system, head shape, eye system, mouth system, proportions, rendering family, composition style, lighting model, environment system, emotional rendering, rarity progression, legendary philosophy, and card structure
- role language and trait vocabulary
- dynamic trait taxonomy and mood culture for the collection
- rarity philosophy, legendary mythology, animation language, and forbidden similarities
- visual fingerprint for distinctiveness scoring

The generator avoids platform palette reuse, generic prompt patterns, fixed archetype templates, and static brand-kit cards. Social links can influence community context, but raw URLs must not become visible trait names.

## Rarity Rules

Preview generation produces one concept NFT per rarity tier so the ladder can be audited.

- Common: low-density read in the collection's own renderer, 2-4 visible traits, no premium event treatment.
- Uncommon: visible expression, posture, camera, prop, or environment variation.
- Rare: stronger emotional acting, clearer face/body system, richer environment.
- Epic: stronger visual storytelling with composition, lighting, anatomy, environment, or FX escalation.
- Legendary: 9-11 visible traits, unique scene or event frame, visible new camera/anatomy/face/environment, never just a recolor.
- Mythic: 10-12 visible traits, near 1/1 emotional snapshot, unique silhouette/scene, and `MYTHIC_CURATED_COMPOSITION` metadata.

Rendered preview metadata records `renderedTraitKeys`, `traitCount`, `compositionCategory`, and `specialMetadataFlag`. Metadata attributes must match those rendered traits exactly.

## Quality Gates

The validator rejects:

- common samples with premium aura/frame/scene treatment
- epic samples without aura or premium background treatment
- legendary/mythic samples without unique composition traits
- reused poses across too many rarity samples
- trait collisions such as full headgear plus visor hardware
- platform palette reuse as collection identity
- generic patterns such as "neon cyber frog"
- fixed archetype template keys instead of generated Creative DNA
- missing Creative DNA or missing signal profile
- sparse metadata falling back to generic robot/crown/vault traits
- collections whose visual fingerprint is too close to previous generated collections
- missing visual design system fields
- rarity previews that reuse the same face, silhouette, framing, composition, lighting, or card structure without visible progression

## Production Readiness

Preview output is concept-only. Launch is blocked unless both are configured:

- real asset providers: `DESIGN_MODEL_PROVIDER`, `LAYER_PACK_PROVIDER`, and `LEGENDARY_ASSET_PROVIDER` set to `ai`, `curated`, or `handmade`
- permanent storage: `FINAL_ASSET_STORAGE_PROVIDER=pinata|arweave|irys` with the required credentials

The asset manifest reports exact blockers. The system does not mark deterministic SVG previews as production-ready final NFT art.
