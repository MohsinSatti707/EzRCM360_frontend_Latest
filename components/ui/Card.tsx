export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Raised elevation for emphasis (Microsoft-style floating cards) */
  elevated?: boolean;
}

export function Card({ children, className = "", elevated = false }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card transition-all duration-300 ${
        elevated
          ? "shadow-[var(--shadow-card-hover)]"
          : "shadow-none hover:shadow-[var(--shadow-card)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
