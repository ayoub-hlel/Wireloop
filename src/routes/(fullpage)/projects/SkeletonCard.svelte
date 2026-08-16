<div class="skeleton-card">
  <div class="skeleton-thumbnail"></div>
  <div class="skeleton-body">
    <div class="skeleton-line skeleton-line-lg"></div>
    <div class="skeleton-line skeleton-line-sm"></div>
  </div>
</div>

<style>
  .skeleton-card {
    display: flex;
    flex-direction: column;
    width: min(var(--project-card-width), 100%);
    max-width: 100%;
    height: var(--project-card-height);
    border-radius: 0.75rem;
    overflow: hidden;
    justify-self: center;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
  }

  .skeleton-thumbnail {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-body {
    padding: 0.75rem 0.875rem 0.5rem;
  }

  .skeleton-line {
    height: 0.625rem;
    border-radius: 0.25rem;
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-line-lg {
    width: 70%;
    margin-bottom: 0.5rem;
  }

  .skeleton-line-sm {
    width: 40%;
    height: 0.5rem;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (max-width: 768px) {
    .skeleton-card:nth-child(n + 3) {
      display: none;
    }
  }
</style>
