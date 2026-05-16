# Premium Image Provider Comparison

Date: 2026-05-17

Status: decision prep only. No provider is selected or locked. Default Studio previews must remain local/component-rendered, free, cached, and non-AI. Paid image generation is only for optional premium inspiration and must stay explicit, cost-displayed, cached, and user-triggered.

## Hard Product Rule

Final 10k collection generation must not call any AI provider. Final assets require an approved trait manifest, approved layer pack, immutable storage, deterministic renderer, and provenance hash. AI image providers can only create premium concept/inspiration assets.

## Comparison

| Provider | Current official pricing signal | Quality/use-case fit | Rate limits/reliability | Terms/IP signal | Consistency/style-sheet/layout fit | Phew recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI GPT Image 1.5 | Official model page lists image token prices at $8 input / $32 output per 1M image tokens and per-image examples: 1024 square low $0.009, medium $0.034, high $0.133; 1024x1536/1536x1024 high $0.20. | Strong instruction following, editing, transparency, and text rendering. Good for mascot/concept exploration, not deterministic collection generation. | Official model page lists tiered IPM from 5 to 250 images/minute by usage tier. API docs call out latency and layout/consistency limitations. | OpenAI says it does not claim copyright over API outputs; API service terms include IP indemnity language for qualifying API customers. | Good prompt adherence but OpenAI documents limitations around consistency and precise structured layout. Not sufficient for deterministic trait packs. | Serious candidate for premium inspiration. Do not use for final renders. |
| Google Gemini / Imagen | Gemini 3.1 Flash Image Preview: $60 / 1M image output tokens, equivalent to $0.045 at 0.5K, $0.067 at 1K, $0.101 at 2K, $0.151 at 4K. Imagen 4 Fast/Standard/Ultra: $0.02/$0.04/$0.06 per image. | Imagen 4 is explicitly positioned for image quality and text rendering. Gemini image is useful for conversational/contextual ideation. SynthID watermark applies to generated images. | Paid tier has higher limits; Google docs say preview models can change and have more restrictive rate limits. Active limits are project/tier dependent. | Gemini API terms say Google will not claim ownership over original generated content; paid services are not used to improve Google products. | Strong for art-direction exploration; Imagen likely stronger for polished concepts. Still not deterministic enough for trait-manifest final generation. | Serious candidate. Needs sample bake-off against OpenAI and Flux before lock. |
| Stability AI | Official Stability pages describe a credit model with endpoint-specific pricing and 2025 API pricing updates; current platform pricing pages were not extractable in this audit, so exact current per-image production API pricing must be verified in the dashboard before selection. Stable Assistant/Artisan public pages cite 6.5 credits for some image generations, but that is not a reliable API contract. | Strong ecosystem and SD lineage; good for flexible styles and self-host/open-weight options, but hosted API terms/pricing need fresh validation. | Endpoint-specific; official KB says credit cost varies by endpoint and parameters. Need live dashboard/API pricing validation. | Stability terms govern API and generated outputs; legal/commercial fit must be reviewed before NFT-facing use. | Can be good with LoRA/style training/self-host options, but consistency depends heavily on model/workflow. | Keep in consideration only after current API pricing/terms are manually verified. |
| Black Forest Labs / FLUX | Official BFL docs: 1 credit = $0.01; FLUX.2 pricing is megapixel-based. FLUX.2 starts at $0.014/image for klein 4B, $0.03 for pro, $0.07 for max, $0.06 for flex; FLUX.1 Kontext pro/max are $0.04/$0.08. | Excellent candidate for high-quality image concepts, style exploration, and typography/control-oriented workflows. FLUX.2 flex is positioned for fine-grained control and typography. | BFL exposes official API status and credit billing; rate limits need account dashboard verification. | BFL API terms grant BFL rights to use input/output to operate and improve services; this needs legal review for Phew community artwork. | Better control options than many generic generators; still not a substitute for approved layer packs and deterministic rendering. | Strong candidate for premium concepts if terms are acceptable. |
| Recraft | Official API pricing: V4 raster $0.04/image, V4 Pro $0.25/image, V4 vector $0.08/image, V4 Pro vector $0.30/image; style creation $0.04/request. | Strong for graphic design, vectors, logos, clean style systems, and editable SVG/vector workflows. | API unit prepay model; rate limits need account verification. | Need full API terms/legal review before NFT-facing use. | Very relevant for style sheets, logo-adjacent assets, and vector/layer inspiration. | Add to bake-off. Potentially better for design-system/style-guide assets than pure raster providers. |
| Ideogram | Official API pricing page says flat fee per output image and default rate limit of 10 in-flight requests. Pricing table must be viewed in live page/dashboard for exact model/quality rows. | Known for typography/text-in-image and graphic prompts. Character consistency is supported in Ideogram 3.0 API according to its pricing page. | Default 10 in-flight requests; volume discounts available. | Requires Developer API Agreement and policy review. | Good candidate for meme text/logo/banner concepts; not final deterministic asset pipeline. | Add to bake-off for text-heavy meme assets. |

## Decision Criteria For Phew

1. Cost per successful concept, not just listed price per image.
2. Ability to maintain mascot/style consistency across a Studio Bible.
3. Commercial/IP terms compatible with NFT launch pages and community branding.
4. Explicit API rate limits that support bursty creator launches.
5. Structured layout ability for trait sheets, layer breakdowns, and style bibles.
6. Provider reliability and error behavior under cost-guard/caching.
7. No provider may be enabled for default free previews or final 10k generation.

## Current Position

Best likely short list for a paid premium-concept bake-off:

- OpenAI GPT Image 1.5 for instruction following and editing.
- Google Imagen 4 for quality/cost balance.
- BFL FLUX.2 for control and style quality.
- Recraft for vector/style-system outputs.
- Ideogram for text-heavy meme/banner concepts.

Before implementation locks a provider, run a paid bake-off on 10 fixed Phew prompts with cost logging and output scoring. User approval is required before enabling any paid provider in production.

## Sources

- OpenAI image generation guide: https://platform.openai.com/docs/guides/image-generation
- OpenAI GPT Image 1.5 model/pricing/rate limits: https://developers.openai.com/api/docs/models/gpt-image-1.5
- OpenAI API output copyright help: https://help.openai.com/en/articles/5008634-will-openai-claim-copyright-over-what-outputs-i-generate-with-the-api
- OpenAI service terms: https://openai.com/policies/service-terms/
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Google Gemini API terms: https://ai.google.dev/gemini-api/terms
- Google Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- BFL FLUX API pricing: https://docs.bfl.ai/quick_start/pricing
- BFL FLUX API service terms: https://bfl.ai/legal/flux-api-service-terms
- Stability AI API pricing update: https://stability.ai/api-pricing-update-25
- Stability AI support note on credits/billing: https://kb.stability.ai/knowledge-base/why-are-my-credits-being-spent-at-inconsistent-amounts
- Stability AI terms: https://stability.ai/terms-of-service
- Recraft API pricing: https://www.recraft.ai/docs/api-reference/pricing
- Ideogram API pricing: https://ideogram.ai/features/api-pricing
