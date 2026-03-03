export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Raised elevation for emphasis (Microsoft-style floating cards) */
  elevated?: boolean;
}

export function Card({ children, className = "", elevated = false }: CardProps) {
  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 ${
        elevated ? "shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
