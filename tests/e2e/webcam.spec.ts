import { expect, test } from "@playwright/test";

// Cámara simulada de Chromium: valida en navegador real la propiedad del stream (R1) y el
// dimensionado del canvas con DPR acotado (R4).
test.use({
  permissions: ["camera"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  deviceScaleFactor: 3,
});

test.describe("Landing · fondo con webcam", () => {
  test("acota el DPR del canvas y detiene la pista al desmontarse", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const canvas = page.locator("canvas.transition-opacity.opacity-100");
    await expect(canvas).toHaveCount(1, { timeout: 15_000 });

    const size = await canvas.evaluate((c: HTMLCanvasElement) => ({ width: c.width, cssWidth: c.clientWidth }));
    expect(size.width).toBe(Math.round(size.cssWidth * 2));

    await page.evaluate(() => {
      const stream = document.querySelector("video")?.srcObject as MediaStream | null;
      (window as unknown as { __track?: MediaStreamTrack }).__track = stream?.getVideoTracks()[0];
    });
    expect(await page.evaluate(() => (window as unknown as { __track?: MediaStreamTrack }).__track?.readyState)).toBe("live");

    // Fuera del viewport el hero desmonta la webcam: la pista debe quedar detenida.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("video")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __track?: MediaStreamTrack }).__track?.readyState)).toBe("ended");
    expect(errors).toEqual([]);
  });
});
