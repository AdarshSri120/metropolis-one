import assert from "node:assert/strict";
import test from "node:test";

test("scroll and right-click listeners do not stack when the view changes", async () => {
  const up = await fetch("http://127.0.0.1:8080/").then((r) => r.ok).catch(() => false);
  if (!up) {
    assert.fail("the city is not running, so the camera listener check could not run");
  }
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      const live = { wheel: 0, contextmenu: 0 };
      const add = EventTarget.prototype.addEventListener;
      const rem = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (this instanceof HTMLCanvasElement && (type === "wheel" || type === "contextmenu")) {
          live[type] += 1;
          window.__camListeners = { ...live };
        }
        return add.call(this, type, listener, options);
      };
      EventTarget.prototype.removeEventListener = function (type, listener, options) {
        if (this instanceof HTMLCanvasElement && (type === "wheel" || type === "contextmenu")) {
          live[type] -= 1;
          window.__camListeners = { ...live };
        }
        return rem.call(this, type, listener, options);
      };
    });
    await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__city && window.__city.ready === true);
    await page.getByRole("button", { name: "Enter Riverside" }).click();
    await page.waitForFunction(() => !document.querySelector(".veil"));
    await page.getByRole("button", { name: "Lots" }).click();
    await page.getByRole("button", { name: "3D" }).click();
    await page.getByRole("button", { name: "Lots" }).click();
    await page.waitForTimeout(400);
    const counts = await page.evaluate(() => window.__camListeners);
    assert.deepEqual(counts, { wheel: 1, contextmenu: 1 });
  } finally {
    await browser.close();
  }
});
