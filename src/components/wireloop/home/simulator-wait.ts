export interface SizedContainer {
  clientWidth: number;
  clientHeight: number;
}

export type ObserveFn = (onResize: () => void) => () => void;

export interface WaitOptions {
  /** Reject after this many ms if the container never sizes. Infinity = wait forever. */
  timeoutMs?: number;
  /** Poll interval when no observer is provided. */
  pollMs?: number;
  /**
   * Resize listener override (e.g. wrapping ResizeObserver). Receives a
   * callback to fire when the container resizes and must return an unsubscribe.
   * Falls back to polling when omitted.
   */
  observe?: ObserveFn;
}

/**
 * Resolves with a usable container size (clientWidth/clientHeight minus the
 * 10px inset) once the container is laid out, rejecting with
 * `Error('sim:no-container-size')` after `timeoutMs` if it never sizes.
 * Uses `observe` (ResizeObserver) when provided, else polls — replaces
 * Simulator.svelte's busy-wait loop (WL-008).
 */
export const waitForContainerSize = (
  container: SizedContainer,
  { timeoutMs = 5000, pollMs = 50, observe }: WaitOptions = {}
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const read = () => ({
      width: container.clientWidth - 10,
      height: container.clientHeight - 10,
    });
    const ready = () => container.clientWidth >= 10 && container.clientHeight >= 10;

    if (ready()) {
      resolve(read());
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stop: (() => void) | undefined;

    const finish = (ok: boolean) => {
      if (timer) clearTimeout(timer);
      stop?.();
      if (ok) resolve(read());
      else reject(new Error("sim:no-container-size"));
    };

    if (Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => finish(false), timeoutMs);
    }

    if (observe) {
      stop = observe(() => {
        if (ready()) finish(true);
      });
    } else {
      const iv = setInterval(() => {
        if (ready()) finish(true);
      }, pollMs);
      stop = () => clearInterval(iv);
    }
  });
