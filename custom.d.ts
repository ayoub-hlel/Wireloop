declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

declare module 'blockly-field-color-wheel' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export default content;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const FieldColorWheel: any;
}

/* ── Web Serial API (ambient — @types/w3c-web-serial unavailable) ── */
interface WebSerialPortInfo {
  usbProductId?: number;
  usbVendorId?: number;
}

interface WebSerialPort {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
  open(options?: { baudRate: number; baudrate?: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): WebSerialPortInfo;
  setSignals(signals: Record<string, boolean>): Promise<void>;
}

interface WebSerialAPI {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>;
  getPorts(): Promise<WebSerialPort[]>;
}

declare class AvrgirlArduino {
  constructor(options: { board: string; debug?: boolean });
}

interface Window {
  AvrgirlArduino: typeof AvrgirlArduino;
}

interface Navigator {
  readonly serial: WebSerialAPI;
}

/* ── Cloudflare R2 binding ── */
interface R2Bucket {
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string>; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
}


