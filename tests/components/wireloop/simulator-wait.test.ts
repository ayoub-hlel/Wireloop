import { describe, it, expect, vi, afterEach } from "vitest";
import { waitForContainerSize } from "@/components/wireloop/home/simulator-wait";

// WL-008: Simulator.svelte busy-polls up to 5s for a sized container and gives
// up permanently (dead canvas, no subscriptions). waitForContainerSize replaces
// that with a ResizeObserver-driven wait + polling fallback.
afterEach(() => {
  vi.useRealTimers();
});

describe("waitForContainerSize", () => {
  it("resolves immediately when the container is already sized (minus 10px inset)", async () => {
    const container = { clientWidth: 200, clientHeight: 150 };
    await expect(waitForContainerSize(container)).resolves.toEqual({
      width: 190,
      height: 140,
    });
  });

  it("resolves via the ResizeObserver callback once the container is laid out", async () => {
    vi.useFakeTimers();
    const container = { clientWidth: 0, clientHeight: 0 };
    let onResize: () => void = () => {};
    const observe = (cb: () => void) => {
      onResize = cb;
      return () => {};
    };

    const pending = waitForContainerSize(container, { observe });
    container.clientWidth = 200;
    container.clientHeight = 150;
    onResize(); // RO fires after layout

    await expect(pending).resolves.toEqual({ width: 190, height: 140 });
  });

  it("falls back to polling when no observer is provided", async () => {
    vi.useFakeTimers();
    const container = { clientWidth: 0, clientHeight: 0 };
    const pending = waitForContainerSize(container, { timeoutMs: 1000, pollMs: 50 });

    container.clientWidth = 200;
    container.clientHeight = 150;
    await vi.advanceTimersByTimeAsync(50); // one poll tick

    await expect(pending).resolves.toEqual({ width: 190, height: 140 });
  });

  it("rejects with sim:no-container-size after the timeout when it never sizes", async () => {
    vi.useFakeTimers();
    const container = { clientWidth: 0, clientHeight: 0 };
    const pending = waitForContainerSize(container, {
      observe: () => () => {}, // never fires
      timeoutMs: 1000,
    });

    const assertion = expect(pending).rejects.toThrow("sim:no-container-size");
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("treats a sub-10px container as not ready", async () => {
    vi.useFakeTimers();
    const container = { clientWidth: 8, clientHeight: 8 };
    const pending = waitForContainerSize(container, { timeoutMs: 500 });

    const assertion = expect(pending).rejects.toThrow("sim:no-container-size");
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
  });
});
