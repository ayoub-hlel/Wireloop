import 'blockly';

declare module 'blockly' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Arduino: Record<string, any>;
}

/** Typed alternative to Blockly's `BlockDefinition` (typed `any` upstream). */
export interface BlocklyBlockDef {
  init(this: Blockly.Block): void;
  helpUrl?: string;
  tooltip?: string;
  colour?: number | string;
  [prop: string]: unknown;
}
