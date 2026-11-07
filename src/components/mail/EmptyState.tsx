import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  pulse?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, description, action, pulse, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[320px] flex-col items-center justify-center px-6 py-14 text-center animate-fade-up",
        className,
      )}
    >
      <div className="relative mb-6 grid size-16 place-items-center">
        {pulse && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping-slow" />
            <span
              className="absolute inset-0 rounded-full bg-primary/15 animate-ping-slow"
              style={{ animationDelay: "1.2s" }}
            />
          </>
        )}
        <div className="relative grid size-16 place-items-center rounded-2xl glass-strong text-primary [&_svg]:size-7">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
