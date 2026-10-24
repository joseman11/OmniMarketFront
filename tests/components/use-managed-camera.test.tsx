import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useManagedCamera } from "@/hooks/use-managed-camera";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeStream() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { stream, track };
}

let pending: Deferred<MediaStream>[];
let video: HTMLVideoElement;
/** Ref estable, como el useRef del componente (una ref nueva por render relanzaría el efecto). */
let videoRef: { current: HTMLVideoElement };

beforeEach(() => {
  pending = [];
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(() => {
        const next = deferred<MediaStream>();
        pending.push(next);
        return next.promise;
      }),
    },
  });
  video = document.createElement("video");
  video.play = vi.fn(() => Promise.resolve());
  videoRef = { current: video };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ref = () => videoRef;

describe("useManagedCamera (R1)", () => {
  it("detiene las pistas exactamente una vez si el permiso llega después del unmount", async () => {
    const { unmount } = renderHook(() => useManagedCamera(ref()));
    expect(pending).toHaveLength(1);
    unmount();

    const { stream, track } = fakeStream();
    await act(async () => pending[0]!.resolve(stream));
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeFalsy();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("en StrictMode cada adquisición es dueña de su stream: ninguna pista queda viva ni se detiene dos veces", async () => {
    // reactStrictMode reproduce setup → cleanup → setup (un wrapper <StrictMode> no lo hace en renderHook).
    const { result, unmount } = renderHook(() => useManagedCamera(ref()), { reactStrictMode: true });
    expect(pending).toHaveLength(2); // setup → cleanup → setup

    const first = fakeStream();
    const second = fakeStream();
    // La resolución de la primera (ya limpiada) llega tarde, después de la segunda.
    await act(async () => pending[1]!.resolve(second.stream));
    await act(async () => pending[0]!.resolve(first.stream));
    await waitFor(() => expect(result.current.state.status).toBe("live"));

    expect(first.track.stop).toHaveBeenCalledTimes(1);
    expect(second.track.stop).not.toHaveBeenCalled();
    expect(video.srcObject).toBe(second.stream);

    unmount();
    expect(second.track.stop).toHaveBeenCalledTimes(1);
    expect(first.track.stop).toHaveBeenCalledTimes(1);
  });

  it("libera el stream una sola vez si play() falla e informa el error", async () => {
    video.play = vi.fn(() => Promise.reject(new DOMException("bloqueado", "NotAllowedError")));
    const { result, unmount } = renderHook(() => useManagedCamera(ref()));
    const { stream, track } = fakeStream();
    await act(async () => pending[0]!.resolve(stream));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    unmount();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("al deshabilitarse con la adquisición pendiente, la resolución tardía se detiene", async () => {
    const { rerender } = renderHook(({ enabled }) => useManagedCamera(ref(), enabled), { initialProps: { enabled: true } });
    rerender({ enabled: false });
    const { stream, track } = fakeStream();
    await act(async () => pending[0]!.resolve(stream));
    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});
