# TOKENToo Generator Culture Engine

TOKENToo generation is CA-first. The only required creator input is the token CA / mint. Helius token metadata, token logo/image, name, symbol, description, website/social links, extensions, and inferred community language are the source of truth. Manual overrides are optional and should be treated as creator corrections, not the primary creative input.

## CA-First Identity Extraction

The backend normalizes token metadata into a creative source packet:

- mint, name, symbol, description, metadata URI, logo/image URI
- website and social-link presence
- extension keys and community phrases
- logo-derived palette and shape language
- inferred memes, slogans, lore, roles, raid names, and vocabulary

The generator must never fall back to a mock community identity when metadata exists. Missing metadata can produce a draft, but not a production-ready launch.

## Creative DNA

Art style is collection-specific. The engine extracts open-ended signals from metadata, logo analysis, creator hints, socials, and fallback market/profile text, then generates Creative DNA. Animal, medical, market, machine, cozy, luxury, aggressive, chaotic, and surreal words are low-level semantic weights only; they are not final templates.

Creative DNA includes art style, world concept, mascot or subject, base silhouette rules, camera framing, palette, texture language, mood culture, expression language, trait category labels, rarity philosophy, legendary mythology, animation language, and forbidden similarities.

The generated style is stored with a reason so reviewers can tell which metadata and signal weights produced that direction.

## Community Trait Taxonomy

Collections do not share one global taxonomy. The engine still uses semantic roles internally so rendering can find a base, background, head, eye, mouth, body, prop, FX, frame, legendary, and animation layer. The user-facing taxonomy is community-native and generated per collection.

Examples:

- a medical/contamination token might generate Infection Stages, Quarantine Scenes, Lab Relics, and Fever Moods
- a dream/cute token might generate Dream Layers, Candy Mutations, Sleepy Poses, and Cloud Accessories
- a market-stress token might generate Market Scars, Terminal Reflections, Stress Expressions, and Liquidation Auras

The quality gate fails if taxonomy labels collapse back into generic headgear/eyes/armor/aura/frame vocabulary.

## Emotional Culture Engine

Each collection receives named mood states with:

- expression
- eye language
- mouth language
- stance
- gesture
- aura behavior
- animation state

These are not global emotion names. They are generated from the same Creative DNA and signal profile as the taxonomy. Future animation systems can consume these states directly.

## Rarity Complexity Rules

Rarity rules are consistent, but visual execution is collection-specific.

- Common: simple background, low trait count, restrained emotion, low FX
- Uncommon: mild expression, accessory, or background variation
- Rare: stronger expression, better outfit/accessory/environment
- Epic: clear personality, stronger silhouette, aura/scene FX, richer background
- Legendary: unique pose or scene, special composition, unique emotional state, special background
- Mythic: near 1/1 curated identity snapshot with explicit `MYTHIC_CURATED_COMPOSITION`

Legendary and mythic outputs must not be recolors. They need new composition language.

## Anti-Generic Validation

Generation must fail or block approval when:

- two collections share too many trait names
- two collections share the same trait taxonomy structure
- two collections share the same world concept
- the same art style repeats too often
- pose or silhouette language repeats too much
- mood vocabulary repeats too much
- legendary structure repeats too much
- crown/armor/aura/frame concepts repeat without metadata support
- emotions are generic global labels
- legendary traits are recolors
- common NFTs are overloaded
- metadata attributes do not match rendered traits
- the collection reads as generic AI NFT art

The quality sample gate exercises multiple metadata examples and verifies that each one produces unique Creative DNA. HANTA-style sparse metadata is expected to produce DNA strongly related to Hantavirus-like signals, not a hardcoded biohazard template.

## Animation Readiness

Every style profile outputs animation metadata:

- blink layers
- mouth layers
- eye variants
- aura loops
- FX loops
- emotional transitions
- idle states
- mint, redeem, stake, unstake, receive NFT, level up, raid success, and reward reactions

These are specs for future animation layers, not a promise that animation assets already exist.

## Production Readiness

The generator is an art-direction and composition system. It is not a pure AI image factory.

Production launch must distinguish:

- concept preview
- AI-assisted draft
- curated production-ready assets
- artist-approved final assets

Common, uncommon, and rare NFTs must be assembled from approved curated or handmade layer packs. Epic, legendary, and mythic NFTs require stronger curation, unique composition rules, and optional artist review.

AI-generated images may support concept previews, exploratory drafts, or reviewed legendary concepts, but the platform must not depend on fully AI-generated final NFT images. A collection cannot be marked production-ready if it only has generic AI-generated images or deterministic fallback previews.
