// ponytail: minimal $app/stores mock — only what @sentry/sveltekit touches in tests
const noopStore = { subscribe: () => () => {} };

export const page = noopStore;
export const navigating = noopStore;
export const updated = { ...noopStore, check: async () => false };
