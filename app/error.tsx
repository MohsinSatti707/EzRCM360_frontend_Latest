"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="font-aileron text-2xl font-bold text-foreground">Something went wrong</h2>
      <button
        onClick={reset}
        className="rounded-[5px] bg-primary px-4 py-2 font-aileron text-sm text-white hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
