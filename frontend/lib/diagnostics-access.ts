export function showPrivateDiagnostics(walletAddress?: string | null) {
  if (process.env.NODE_ENV !== "production") return true;
  if ((process.env.NEXT_PUBLIC_ENABLE_DEV_DIAGNOSTICS ?? "false") === "true") return true;
  const wallet = walletAddress?.trim();
  if (!wallet) return false;
  return configuredWallets().has(wallet);
}

function configuredWallets() {
  const raw = `${process.env.NEXT_PUBLIC_ADMIN_WALLETS ?? ""},${process.env.NEXT_PUBLIC_CREATOR_WALLETS ?? ""}`;
  return new Set(raw.split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean));
}
