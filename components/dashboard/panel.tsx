import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  action,
  className,
  children,
  ...rest
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"section">, "title">) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.01] p-5 md:p-6",
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[15px] font-medium text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-white/45">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  accent,
  description,
  actions,
}: {
  title: string;
  accent?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {title}
          {accent && <span className="font-serif font-normal italic text-brand-soft"> {accent}</span>}
        </h1>
        {description && <p className="mt-2 text-sm text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/25 bg-danger/[0.06] p-6 text-center">
      <p className="text-sm text-white/75">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/[0.06]"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
