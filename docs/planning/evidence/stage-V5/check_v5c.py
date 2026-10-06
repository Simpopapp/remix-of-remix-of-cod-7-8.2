import asyncio, time
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path("/tmp/browser/v5-phase/shots"); SHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        t0 = time.time()
        await page.goto("http://localhost:8080/play", wait_until="domcontentloaded")
        await page.wait_for_timeout(6000)
        btn = page.get_by_role("button", name="Assumir o controle")
        for _ in range(6):
            try:
                await btn.click(timeout=30000, force=True); break
            except Exception as e:
                print("click retry:", str(e)[:100])
        await page.wait_for_timeout(7500)  # skip intro
        await page.keyboard.press("2")
        await page.wait_for_timeout(1300)
        await page.screenshot(path=str(SHOTS / "16_pistol_hip.png"), timeout=180000)
        print(f"hip {time.time()-t0:.1f}s")
        await page.mouse.down(button="right"); await page.wait_for_timeout(800)
        await page.screenshot(path=str(SHOTS / "17_ads_pistol_closeup.png"), timeout=180000)
        await page.mouse.up(button="right")
        print(f"ads {time.time()-t0:.1f}s")
        print("console errors:", errors if errors else "NONE")
        await browser.close()

asyncio.run(main())
