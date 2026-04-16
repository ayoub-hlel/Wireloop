declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

declare module 'blockly-field-color-wheel' {
  const content: any;
  export default content;
  export const FieldColorWheel: any;
}

declare module '$env/static/public' {
  export const PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  export const PUBLIC_CONVEX_URL: string;
}
