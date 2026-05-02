export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function compactAddress(address: string) {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

