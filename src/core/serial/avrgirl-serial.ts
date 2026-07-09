export class SerialPort {
  public browser: boolean;

  public options: Record<string, unknown>;

  public path: string;

  public isOpen: boolean;

  public port: WebSerialPort | null;

  public writer: WritableStreamDefaultWriter<Uint8Array> | null;

  public reader: ReadableStreamDefaultReader<Uint8Array> | null;

  public baudRate: number;

  public requestOptions: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> };

  public messageRaw: string;

  public chunks = "";

  constructor(options: Record<string, unknown>, private onMessage: (message: string) => void) {
    this.options = options || {};

    this.browser = true;
    this.path = this.options.path as string;
    this.isOpen = false;
    this.port = null;
    this.writer = null;
    this.reader = null;
    this.baudRate = this.options.baudRate as number;
    this.requestOptions = (this.options.requestOptions as { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }) || {};
    this.messageRaw = "";

    if (this.options.autoOpen) this.open();
  }

  list(callback?: (error: Error | null, list?: WebSerialPort[]) => void) {
    return navigator.serial
      .getPorts()
      .then((list: WebSerialPort[]) => {
        if (callback) {
          return callback(null, list);
        }
      })
      .catch((error: Error) => {
        if (callback) {
          return callback(error);
        }
      });
  }

  open(callback?: (error: Error | null) => void) {
    navigator.serial
      .requestPort(this.requestOptions)
      .then((serialPort: WebSerialPort) => {
        this.port = serialPort;
        if (this.isOpen) return;
        return this.port.open({ baudRate: this.baudRate || 57600, baudrate: this.baudRate || 57600 });
      })
      .then(() => {
        if (this.port) {
          this.writer = this.port.writable.getWriter();
        }
      })
      .then(() => {
        if (this.port) {
          this.reader = this.port.readable.getReader();
        }
      })
      .then(async () => {
        this.isOpen = true;
        void(callback && callback(null));
        while (this.port?.readable.locked) {
          try {
            const { value, done } = await this.reader!.read();
            if (done) {
              break;
            }
            const textDecoder = new TextDecoder();

            // Append new chunks to existing chunks.
            this.chunks += textDecoder.decode(value);
            // For each line breaks in chunks, send the parsed lines out.
            const lines = this.chunks.split("\n");
            this.chunks = lines.pop() ?? '';
            lines.forEach((line: string) => this.onMessage(line));
          } catch (e: unknown) {
            console.error(e);
          }
        }
      })
      .catch((error: Error) => {
        void(callback && callback(error));
      });
  }

  async close(callback?: (error: Error | null) => void) {
    try {
      await this.reader!.cancel();
      await this.reader!.releaseLock();
      await this.writer!.releaseLock();
      await this.port!.close();
      this.isOpen = false;
      this.chunks = "";
    } catch (error: unknown) {
      if (callback) return callback(error as Error);
      throw error;
    }
    void(callback && callback(null));
  }

  async set(props: Record<string, unknown> = {}, callback?: (error: Error | null) => void) {
    try {
      const signals: Record<string, boolean> = {};
      if (Object.prototype.hasOwnProperty.call(props, "dtr")) {
        signals.dataTerminalReady = props.dtr as boolean;
      }
      if (Object.prototype.hasOwnProperty.call(props, "rts")) {
        signals.requestToSend = props.rts as boolean;
      }
      if (Object.prototype.hasOwnProperty.call(props, "brk")) {
        signals.break = props.brk as boolean;
      }
      if (Object.keys(signals).length > 0) {
        await this.port!.setSignals(signals);
      }
    } catch (error: unknown) {
      if (callback) return callback(error as Error);
      throw error;
    }
    if (callback) return callback(null);
  }

  write(message: string, callback?: (error: Error | null) => void) {
    const textEncoder = new TextEncoder();
    this.writer!.write(textEncoder.encode(message));
    if (callback) return callback(null);
  }

  async read(callback?: (error: Error | null, buffer?: ReadableStreamReadResult<Uint8Array>) => void) {
    let buffer: ReadableStreamReadResult<Uint8Array>;
    try {
      buffer = await this.reader!.read();
    } catch (error: unknown) {
      if (callback) return callback(error as Error);
      throw error;
    }
    if (callback) callback(null, buffer);
  }

  flush(callback?: (error: Error | null) => void) {
    console.warn("flush method is a NOP right now");
    if (callback) return callback(null);
  }

  drain(callback?: (error: Error | null) => void) {
    console.warn("drain method is a NOP right now");
    if (callback) return callback(null);
  }
}
