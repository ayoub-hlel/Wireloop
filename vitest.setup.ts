class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Node-environment tests (integration tier) have no window — guard so the same
// setup file works for both jsdom and node runs.
if (typeof window !== "undefined") {
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
