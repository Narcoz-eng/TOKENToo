import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconAsset?: string;
  loading?: boolean;
  success?: boolean;
  tone?: "primary" | "outline" | "ghost" | "gold";
};

export function AnimatedButton({ children, className, iconAsset, loading, success, tone = "primary", disabled, ...props }: AnimatedButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "phew-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "phew-button-primary text-black",
        tone === "outline" && "border border-vault-green/50 bg-vault-green/10 text-vault-green hover:bg-vault-green/15",
        tone === "ghost" && "border border-vault-line bg-black/35 text-slate-100 hover:border-vault-cyan/60 hover:text-vault-cyan",
        tone === "gold" && "border border-vault-gold/55 bg-vault-gold/10 text-vault-gold hover:bg-vault-gold/15",
        success && "phew-success-pop",
        className
      )}
    >
      {loading ? (
        iconAsset ? <img src={iconAsset} alt="" className="size-5 animate-spin object-contain" /> : <span className="phew-button-loader" aria-hidden="true" />
      ) : iconAsset ? <img src={iconAsset} alt="" className="size-5 object-contain" /> : null}
      <span>{children}</span>
    </button>
  );
}
