export function seedFrom(value: string) {
  return [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 11), 0);
}

export function pick<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length] as T;
}

export function titleCase(value: string) {
  return value
    .replace(/[$_,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function slugWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 12);
}

export function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function unique<T>(items: T[]) {
  return [...new Set(items)];
}

