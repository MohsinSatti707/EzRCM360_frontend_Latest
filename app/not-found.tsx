export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h2 className="font-aileron text-2xl font-bold text-foreground">404 — Not Found</h2>
      <p className="font-aileron text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
