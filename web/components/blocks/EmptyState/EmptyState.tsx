/** Hero shown before the first message: large title + one-line pitch. */
export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <h2 className="text-h2 font-bold leading-tight text-primary">Hawk Copilot</h2>
      <p className="mt-2 max-w-sm text-base text-secondary/70">
        Ask anything about Payhawk. Answers are grounded in the help center, with live citations
        and tools.
      </p>
    </div>
  );
}
