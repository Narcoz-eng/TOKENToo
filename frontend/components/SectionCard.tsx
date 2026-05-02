import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  id,
  title,
  action
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("glass rounded-lg p-4", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title ? <h2 className="text-sm font-bold uppercase text-white">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
