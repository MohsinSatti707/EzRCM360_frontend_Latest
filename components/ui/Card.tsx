import { cn } from "@/lib/utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Raised elevation for emphasis */
  elevated?: boolean;
}

/** Matches design card.tsx: rounded-lg border bg-card text-card-foreground shadow-sm */
export function Card({ children, className = "", elevated = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        elevated && "shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Design: flex flex-col space-y-1.5 p-6 */
export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

/** Design: text-2xl font-semibold leading-none tracking-tight */
export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />;
}

/** Design: text-sm text-muted-foreground */
export function CardDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Design: p-6 pt-0 */
export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

/** Design: flex items-center p-6 pt-0 */
export function CardFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
