import { BadRequestException } from "@nestjs/common";

export type ProviderGenerationKind = "studio_text" | "studio_image" | "premium_image" | "local_component_preview";

export type ProviderCostDecision = {
  allowed: boolean;
  noBillableGenerationAttempted: boolean;
  estimatedCostUsd: number;
  issues: string[];
  provider: string;
  kind: ProviderGenerationKind;
};

export interface StudioTextProvider {
  readonly id: string;
  planText(input: { prompt: string; cacheKey?: string }): Promise<{ text: string; cached: boolean; estimatedCostUsd: number }>;
}

export interface StudioImageProvider {
  readonly id: string;
  generateStudioImage(input: { prompt: string; generationType: string; cacheKey?: string }): Promise<{ uri: string; cached: boolean; estimatedCostUsd: number }>;
}

export interface PremiumImageProvider {
  readonly id: string;
  estimate(input: { imageCount: number; quality?: string; size?: string }): { estimatedCostUsd: number; currency: "USD" };
  generatePremiumImage(input: { prompt: string; explicitUserAction: boolean; estimatedCostUsd: number; cacheKey?: string }): Promise<{ uri: string; cached: boolean; estimatedCostUsd: number }>;
}

export interface LocalComponentPreviewProvider {
  readonly id: "local-component-preview";
  renderPreview(input: { collectionDna: unknown; traitCatalog: unknown; seed: string }): { json: unknown; estimatedCostUsd: 0; cached: false };
}

export class ProviderCache<T> {
  private readonly values = new Map<string, T>();

  get(cacheKey: string | undefined) {
    return cacheKey ? this.values.get(cacheKey) : undefined;
  }

  set(cacheKey: string | undefined, value: T) {
    if (cacheKey) this.values.set(cacheKey, value);
    return value;
  }
}

export class ProviderCostGuard {
  constructor(
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly now = () => new Date()
  ) {}

  decide(input: {
    provider: string;
    kind: ProviderGenerationKind;
    estimatedCostUsd?: number;
    cacheHit?: boolean;
    explicitUserAction?: boolean;
  }): ProviderCostDecision {
    const estimatedCostUsd = this.cost(input.estimatedCostUsd);
    const appEnv = this.env.APP_ENV ?? this.env.NODE_ENV ?? "development";
    const paidEnabled = this.env.PAID_AI_GENERATION_ENABLED === "true";
    const devDisabled = this.env.DEV_DISABLE_PAID_AI === "true" && appEnv !== "production";
    const local = input.kind === "local_component_preview" || input.provider === "local-component-preview" || input.provider === "deterministic-render";
    const cached = Boolean(input.cacheHit);
    const issues = [
      !local && !cached && !input.explicitUserAction ? "Paid provider calls require an explicit user action." : null,
      !local && !cached && !paidEnabled ? "PAID_AI_GENERATION_ENABLED must be true before paid provider calls." : null,
      !local && !cached && devDisabled ? "DEV_DISABLE_PAID_AI blocks paid provider calls outside production." : null,
      estimatedCostUsd < 0 ? "Estimated cost cannot be negative." : null
    ].filter(Boolean) as string[];

    return {
      allowed: issues.length === 0,
      noBillableGenerationAttempted: local || cached || issues.length > 0,
      estimatedCostUsd,
      issues,
      provider: input.provider,
      kind: input.kind
    };
  }

  assertAllowed(input: Parameters<ProviderCostGuard["decide"]>[0]) {
    const decision = this.decide(input);
    if (!decision.allowed) {
      throw new BadRequestException({
        code: "PROVIDER_COST_GUARD_BLOCKED",
        message: decision.issues.join(" "),
        details: {
          provider: decision.provider,
          kind: decision.kind,
          estimatedCostUsd: decision.estimatedCostUsd,
          checkedAt: this.now().toISOString(),
          noBillableGenerationAttempted: decision.noBillableGenerationAttempted
        }
      });
    }
    return decision;
  }

  private cost(value: unknown) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }
}
