import Link from "next/link";

/** Design system – matches EzRCM360_Design-main button.tsx */
const baseStyles =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";

const variantStyles = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost:
    "hover:bg-accent hover:text-accent-foreground",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
} as const;

export type ButtonVariant = keyof typeof variantStyles;

/** Action button (no navigation). Single Responsibility: trigger actions. */
export type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
};

export function Button({
  children,
  variant = "primary",
  href,
  className = "",
  type = "button",
  disabled = false,
  onClick,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const cls = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
