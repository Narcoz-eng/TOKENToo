import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("phew-layout phew-dashboard-layout", className)}>{children}</div>;
}

export function ProductFlowLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("phew-layout phew-product-flow-layout", className)}>{children}</div>;
}

export function DetailLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("phew-layout phew-detail-layout", className)}>{children}</div>;
}
