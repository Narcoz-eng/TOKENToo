export type StudioCircuitProvider = "imagen" | "openai" | "gemini-text";

export type StudioCircuitState = {
  provider: StudioCircuitProvider;
  unavailableUntil?: number;
  quotaStatus: "unknown" | "available" | "unavailable";
  lastProbeResult?: string;
  lastErrorCode?: string;
  lastErrorAt?: string;
  disabledModels: Array<{
    model: string;
    disabledUntil: number;
    lastErrorCode?: string;
    lastProbeResult?: string;
    lastErrorAt?: string;
  }>;
};

type ProviderState = Omit<StudioCircuitState, "provider" | "disabledModels">;
type ModelState = {
  disabledUntil: number;
  lastErrorCode?: string;
  lastProbeResult?: string;
  lastErrorAt?: string;
};

const providerState = new Map<StudioCircuitProvider, ProviderState>();
const modelState = new Map<string, ModelState>();

export const MODEL_UNSUPPORTED_DISABLE_MS = 60 * 60 * 1000;
export const PROVIDER_QUOTA_UNAVAILABLE_MS = 15 * 60 * 1000;

export function markStudioModelDisabled(provider: StudioCircuitProvider, model: string, code: string, ttlMs = MODEL_UNSUPPORTED_DISABLE_MS) {
  const now = Date.now();
  modelState.set(modelKey(provider, model), {
    disabledUntil: now + ttlMs,
    lastErrorCode: code,
    lastProbeResult: "unsupported-disabled",
    lastErrorAt: new Date(now).toISOString()
  });
  recordStudioProbe(provider, "unsupported-disabled", code);
}

export function markStudioProviderUnavailable(provider: StudioCircuitProvider, code: string, ttlMs = PROVIDER_QUOTA_UNAVAILABLE_MS) {
  const now = Date.now();
  providerState.set(provider, {
    unavailableUntil: now + ttlMs,
    quotaStatus: "unavailable",
    lastProbeResult: "provider-unavailable",
    lastErrorCode: code,
    lastErrorAt: new Date(now).toISOString()
  });
}

export function recordStudioProviderSuccess(provider: StudioCircuitProvider, result = "generation-succeeded") {
  providerState.set(provider, {
    quotaStatus: "available",
    lastProbeResult: result
  });
}

export function recordStudioProbe(provider: StudioCircuitProvider, result: string, code?: string) {
  const previous = providerState.get(provider);
  providerState.set(provider, {
    ...previous,
    quotaStatus: previous?.quotaStatus ?? "unknown",
    lastProbeResult: result,
    lastErrorCode: code ?? previous?.lastErrorCode,
    lastErrorAt: code ? new Date().toISOString() : previous?.lastErrorAt
  });
}

export function studioModelDisabled(provider: StudioCircuitProvider, model: string, now = Date.now()) {
  const state = modelState.get(modelKey(provider, model));
  if (!state) return undefined;
  if (state.disabledUntil <= now) {
    modelState.delete(modelKey(provider, model));
    return undefined;
  }
  return state;
}

export function studioProviderUnavailable(provider: StudioCircuitProvider, now = Date.now()) {
  const state = providerState.get(provider);
  if (!state?.unavailableUntil) return undefined;
  if (state.unavailableUntil <= now) {
    providerState.set(provider, {
      ...state,
      unavailableUntil: undefined,
      quotaStatus: "unknown"
    });
    return undefined;
  }
  return state;
}

export function studioCircuitSnapshot(provider: StudioCircuitProvider, supportedModels: readonly string[] = []): StudioCircuitState {
  const state = providerState.get(provider);
  const now = Date.now();
  const disabledModels = supportedModels
    .map((model) => ({ model, state: studioModelDisabled(provider, model, now) }))
    .filter((entry): entry is { model: string; state: ModelState } => Boolean(entry.state))
    .map(({ model, state }) => ({
      model,
      disabledUntil: state.disabledUntil,
      lastErrorCode: state.lastErrorCode,
      lastProbeResult: state.lastProbeResult,
      lastErrorAt: state.lastErrorAt
    }));

  return {
    provider,
    unavailableUntil: studioProviderUnavailable(provider, now)?.unavailableUntil,
    quotaStatus: studioProviderUnavailable(provider, now) ? "unavailable" : state?.quotaStatus ?? "unknown",
    lastProbeResult: state?.lastProbeResult,
    lastErrorCode: state?.lastErrorCode,
    lastErrorAt: state?.lastErrorAt,
    disabledModels
  };
}

export function resetStudioProviderCircuitBreakers() {
  providerState.clear();
  modelState.clear();
}

function modelKey(provider: StudioCircuitProvider, model: string) {
  return `${provider}:${model}`;
}
