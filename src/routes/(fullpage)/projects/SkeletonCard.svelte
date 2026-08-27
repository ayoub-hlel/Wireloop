<div class="skeleton-card">
  <div class="skeleton-thumbnail"></div>
  <div class="skeleton-body">
    <div class="skeleton-line skeleton-line-lg"></div>
    <div class="skeleton-line skeleton-line-sm"></div>
  </div>
  <div class="skeleton-actions">
    <div class="skeleton-action"></div>
    <div class="skeleton-action"></div>
    <div class="skeleton-action"></div>
  </div>
</div>

<style>
  .skeleton-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--project-card-width);
    height: var(--project-card-height);
    border-radius: var(--ds-radius-lg);
    overflow: hidden;
    justify-self: center;
    background-color: hsl(var(--card));
    border: var(--ds-border-width) solid hsl(var(--border));
  }

  .skeleton-thumbnail {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-body {
    flex: 1;
    padding: var(--ds-space-3) calc(var(--ds-space-3) + 2px) var(--ds-space-2);
  }

  .skeleton-line {
    height: 0.625rem;
    border-radius: var(--ds-radius-xs);
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-line-lg {
    width: 70%;
    margin-bottom: var(--ds-space-2);
  }

  .skeleton-line-sm {
    width: 40%;
    height: 0.5rem;
  }

  .skeleton-actions {
    display: flex;
    align-items: center;
    gap: 0;
    padding: var(--ds-space-2);
    border-top: var(--ds-border-width) solid hsl(var(--border));
  }

  .skeleton-action {
    width: 32px;
    height: 32px;
    border-radius: var(--ds-radius-sm);
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
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
