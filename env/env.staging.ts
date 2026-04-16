import { PUBLIC_CONVEX_URL } from '$env/static/public';

export default {
  // Firebase configuration removed - using Auth.js + Convex instead
  convex: {
    url: PUBLIC_CONVEX_URL || "https://staging.convex.cloud",
  },
  server_arduino_url: "https://compile-staging.arduino-workflow-builder.org",
  bucket_name: "arduino-workflow-builder-lesson-staging",
  useEmulator: false,
  site: "arduino-workflow-builder-staging",
};
