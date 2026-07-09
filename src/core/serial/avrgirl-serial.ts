export class SerialPort {
  public browser: boolean;

  public options: any;

  public path: string;

  public isOpen: boolean;

  public port: any;

  public writer: any;

  public reader: any;

  public baudRate: number;

  public requestOptions: any;

  public messageRaw: string;

  public chunks = "";

  constructor(options: any, private onMessage: (message: string) => void) {
    this.options = options || {};

    this.browser = true;
    this.path = this.options.path;
    this.isOpen = false;
    this.port = null;
    this.writer = null;
    this.reader = null;
    this.baudRate = this.options.baudRate;
    this.requestOptions = this.options.requestOptions || {};
    this.messageRaw = "";

    if (this.options.autoOpen) this.open();
  }

  list(callback?: (error: Error | null, list?: any) => void) {
    return (navigator as any).serial
      .getPorts()
      .then((list: any) => {
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
    (window.navigator as any).serial
      .requestPort(this.requestOptions)
      .then((serialPort: any) => {
        this.port = serialPort;
        if (this.isOpen) return;
        return this.port.open({ baudRate: this.baudRate || 57600, baudrate: this.baudRate || 57600 });
      })
      .then(() => (this.writer = this.port.writable.getWriter()))
      .then(() => (this.reader = this.port.readable.getReader()))
      .then(async () => {
        this.isOpen = true;
        void(callback && callback(null));
        while (this.port.readable.locked) {
          try {
            const { value, done } = await this.reader.read();
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
          } catch (e) {
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
      await this.reader.cancel();
      await this.reader.releaseLock();
      await this.writer.releaseLock();
      await this.port.close();
      this.isOpen = false;
      this.chunks = "";
    } catch (error: unknown) {
      if (callback) return callback(error as Error);
      throw error;
    }
    void(callback && callback(null));
  }

  async set(props: any = {}, callback?: (error: Error | null) => void) {
    try {
      const signals: any = {};
      if (Object.prototype.hasOwnProperty.call(props, "dtr")) {
        signals.dataTerminalReady = props.dtr;
      }
      if (Object.prototype.hasOwnProperty.call(props, "rts")) {
        signals.requestToSend = props.rts;
      }
      if (Object.prototype.hasOwnProperty.call(props, "brk")) {
        signals.break = props.brk;
      }
      if (Object.keys(signals).length > 0) {
        await this.port.setSignals(signals);
      }
    } catch (error: unknown) {
      if (callback) return callback(error as Error);
      throw error;
    }
    if (callback) return callback(null);
  }

  write(message: string, callback?: (error: Error | null) => void) {
    const textEncoder = new TextEncoder();
    this.writer.write(textEncoder.encode(message));
    if (callback) return callback(null);
  }

  async read(callback?: (error: Error | null, buffer?: any) => void) {
    let buffer: any;
    try {
      buffer = await this.reader.read();
    } catch (error: unknown) {
      if (callback) return callback(error as Error);
      throw error;
    }
    if (callback) callback(null, buffer);
  }

  // TODO: is this correct?
  flush(callback?: (error: Error | null) => void) {
    //this.port.flush(); // is this sync or a promise?
    console.warn("flush method is a NOP right now");
    if (callback) return callback(null);
  }

  // TODO: is this correct?
  drain(callback?: (error: Error | null) => void) {
    // this.port.drain(); // is this sync or a promise?
    console.warn("drain method is a NOP right now");
    if (callback) return callback(null);
  }
}
