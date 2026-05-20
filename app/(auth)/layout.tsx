export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Branding panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-sidebar border-e border-border p-10">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-brand-primary flex items-center justify-center">
            <span className="text-sm font-bold text-brand-primary-foreground">
              FP
            </span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">
              Field Project Management
            </h1>
            <p className="text-xs text-text-muted">Operations Platform</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-sm">
          <p className="text-sm text-text-secondary leading-relaxed">
            Plan, schedule, and track field operations across multiple centers.
            Manage activities, sessions, approvals, and reporting — all in one
            place.
          </p>
          <div className="flex flex-col gap-2 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-status-completed" />
              <span>Multi-project operations management</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-status-in-progress" />
              <span>Session scheduling and distribution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-status-approved" />
              <span>Approval workflows and progress tracking</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-disabled">
          © {new Date().getFullYear()} Field PM
        </p>
      </div>

      {/* Auth form panel */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-background">
        {children}
      </div>
    </div>
  );
}
