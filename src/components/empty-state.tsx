import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-4", className)}>
      {/* Open book + 3 sparkle stars in brand-200/300 */}
      <svg
        viewBox="0 0 160 120"
        className="w-40 h-30 max-w-[240px] mb-8 empty-state-illustration"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Open book */}
        <path
          d="M20 90 L20 30 Q20 18 36 18 L80 18 L80 90 Q50 90 20 90 Z"
          fill="#BFDBFE"
          stroke="#93C5FD"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M140 90 L140 30 Q140 18 124 18 L80 18 L80 90 Q110 90 140 90 Z"
          fill="#DBEAFE"
          stroke="#93C5FD"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line x1="80" y1="18" x2="80" y2="90" stroke="#93C5FD" strokeWidth="2" />
        <line x1="28" y1="38" x2="72" y2="38" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="50" x2="72" y2="50" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="62" x2="60" y2="62" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="88" y1="38" x2="132" y2="38" stroke="#BFDBFE" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="88" y1="50" x2="132" y2="50" stroke="#BFDBFE" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="88" y1="62" x2="120" y2="62" stroke="#BFDBFE" strokeWidth="1.5" strokeLinecap="round" />
        {/* Sparkle stars */}
        <path
          className="sparkle"
          d="M45 22 L46.5 26 L51 27.5 L46.5 29 L45 33.5 L43.5 29 L39 27.5 L43.5 26 Z"
          fill="#93C5FD"
          stroke="#60A5FA"
          strokeWidth="0.8"
        />
        <path
          className="sparkle"
          d="M115 25 L116.2 28 L119.5 29.2 L116.2 30.4 L115 33.5 L113.8 30.4 L110.5 29.2 L113.8 28 Z"
          fill="#BFDBFE"
          stroke="#93C5FD"
          strokeWidth="0.8"
        />
        <path
          className="sparkle"
          d="M80 8 L81 11 L84 12 L81 13 L80 16 L79 13 L76 12 L79 11 Z"
          fill="#93C5FD"
          stroke="#60A5FA"
          strokeWidth="0.6"
        />
      </svg>
      <h2 className="text-text-primary font-semibold text-lg mb-2">{title}</h2>
      {description && <p className="text-text-muted text-sm max-w-sm mb-6">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
