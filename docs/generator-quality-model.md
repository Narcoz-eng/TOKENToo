# Generator Quality Model

TOKENToo generation is CA-first. The creator only needs to enter the Solana mint address. Helius token metadata, off-chain metadata, logo/image, name, symbol, description, extensions, and social-link presence become the primary identity source. Manual name, symbol, description, and logo fields are optional overrides and are recorded as overrides.

## Identity Model

Each generated collection stores Brand DNA:

- token source summary and override flags
- logo-derived palette and collection color system
- mascot archetype and silhouette family
- visual world and background language
- role language and trait vocabulary
- base archetypes for the collection
- legendary direction and forbidden similarities
- visual fingerprint for distinctiveness scoring

The generator avoids platform palette reuse and generic prompt patterns. Social links can influence community context, but raw URLs must not become visible trait names.

## Rarity Rules

Preview generation produces one concept NFT per rarity tier so the ladder can be audited.

- Common: simple background, base pose, 2-4 visible traits, no aura, no frame, no premium scene.
- Uncommon: slight variation, 3-5 visible traits, one modest accessory, mild expression/eyes change.
- Rare: 5-7 visible traits, stronger expression, better outfit/accessory, richer background.
- Epic: 7-9 visible traits, aura/effect, premium body detail, stronger silhouette, more complex background.
- Legendary: 9-11 visible traits, unique pose or scene, special frame, unique background, strong FX, never just a recolor.
- Mythic: 10-12 visible traits, near 1/1 composition, unique silhouette/scene, and `MYTHIC_CURATED_COMPOSITION` metadata.

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
- collections whose visual fingerprint is too close to previous generated collections

## Production Readiness

Preview output is concept-only. Launch is blocked unless both are configured:

- real asset providers: `DESIGN_MODEL_PROVIDER`, `LAYER_PACK_PROVIDER`, and `LEGENDARY_ASSET_PROVIDER` set to `ai`, `curated`, or `handmade`
- permanent storage: `FINAL_ASSET_STORAGE_PROVIDER=pinata|arweave|irys` with the required credentials

The asset manifest reports exact blockers. The system does not mark deterministic SVG previews as production-ready final NFT art.
