export const env = new Proxy({} as Record<string, string>, {
  get: (_, key) => process.env[key as string] ?? '',
});
