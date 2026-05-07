import { cn } from "@/lib/utils";

export function PageLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow = "PHEW.DEVNET / Faction OS",
  title,
  description,
  action,
  art
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  art?: React.ReactNode;
}) {
  return (
    <section className="phew-panel phew-scanline relative overflow-hidden rounded-lg p-6">
      {art ? <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-35 mix-blend-screen lg:block">{art}</div> : null}
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-vault-green">{eyebrow}</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-black">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-slate-300">{description}</p> : null}
        </div>
        {action}
      </div>
    </section>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-sm font-black uppercase text-white">{title}</h2>
      {action}
    </div>
  );
}

export function MetricGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 md:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>;
}
