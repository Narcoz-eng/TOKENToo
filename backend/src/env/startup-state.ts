export type StartupCheck = {
  code: string;
  severity: "info" | "warning" | "fatal";
  message: string;
};

export type StartupState = {
  startedAt: string;
  completedAt?: string;
  listeningAt?: string;
  port?: number;
  environment: string;
  bootstrapped: boolean;
  ready: boolean;
  degraded: boolean;
  validation: {
    valid: boolean;
    strict: boolean;
    issues: StartupCheck[];
  };
  modules: string[];
  lastError?: string;
};

const state: StartupState = {
  startedAt: new Date().toISOString(),
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
  bootstrapped: false,
  ready: false,
  degraded: false,
  validation: { valid: true, strict: false, issues: [] },
  modules: []
};

export function startupState() {
  return state;
}

export function recordStartupValidation(validation: StartupState["validation"]) {
  state.validation = validation;
  state.degraded = validation.issues.some((issue) => issue.severity === "warning" || issue.severity === "fatal");
  state.lastError = validation.issues.find((issue) => issue.severity === "fatal")?.message;
}

export function recordStartupModules(modules: string[]) {
  state.modules = modules;
}

export function recordStartupComplete(port?: number) {
  state.bootstrapped = true;
  state.ready = true;
  state.completedAt = new Date().toISOString();
  state.port = port;
}

export function recordStartupListening(port: number) {
  state.listeningAt = new Date().toISOString();
  state.port = port;
  state.ready = true;
}

export function recordStartupFailure(error: unknown) {
  state.ready = false;
  state.lastError = error instanceof Error ? error.message : String(error);
}
