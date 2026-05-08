import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const loadedFiles = new Set<string>();

export function loadLocalEnv() {
  for (const file of envFileCandidates()) {
    if (!existsSync(file) || loadedFiles.has(file)) continue;
    loadedFiles.add(file);
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || process.env[parsed.key] !== undefined) continue;
      process.env[parsed.key] = parsed.value;
    }
  }
}

export function loadedLocalEnvFiles() {
  return [...loadedFiles];
}

function envFileCandidates() {
  const cwd = process.cwd();
  return [
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, "..", ".env.local"),
    resolve(cwd, "..", ".env"),
    resolve(cwd, "backend", ".env.local"),
    resolve(cwd, "backend", ".env")
  ];
}

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
  if (!match) return null;
  return { key: match[1], value: unquote(match[2].trim()) };
}

function unquote(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
