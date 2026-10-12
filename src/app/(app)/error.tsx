'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section role="alert" className="card stack">
      <h1>We could not load your workspace</h1>
      <p className="subtle">Please try again. If the problem continues, contact support.</p>
      <button type="button" className="button" onClick={reset}>Try again</button>
    </section>
  );
}
