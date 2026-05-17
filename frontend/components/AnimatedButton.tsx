import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimatedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  iconAsset?: string;
  loading?: boolean;
  success?: boolean;
  tone?: "primary" | "outline" | "ghost" | "gold";
};

export function AnimatedButton({ children, className, icon: Icon, iconAsset, loading, success, tone = "primary", disabled, ...props }: AnimatedButtonProps) {
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
      {loading ? <Loader2 className="size-4 animate-spin" /> : iconAsset ? <img src={iconAsset} alt="" className="size-5 object-contain" /> : Icon ? <Icon className="size-4" /> : null}
      <span>{children}</span>
    </button>
  );
}
