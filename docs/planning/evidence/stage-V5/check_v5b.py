import asyncio, time
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path("/tmp/browser/v5-phase/shots"); SHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    errors, notfound = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("response", lambda r: notfound.append(f"{r.status} {r.url}") if r.status >= 400 else None)

        t0 = time.time()
        await page.goto("http://localhost:8080/play", wait_until="domcontentloaded")
        print(f"goto {time.time()-t0:.1f}s")
        await page.wait_for_timeout(6000)
        print(f"warmup {time.time()-t0:.1f}s")
        btn = page.get_by_role("button", name="Assumir o controle")
        for _ in range(6):
            try:
                await btn.click(timeout=30000, force=True)
                print(f"clicked {time.time()-t0:.1f}s")
                break
            except Exception as e:
                print("click retry:", str(e)[:100])
        await page.wait_for_timeout(7500)  # skip intro (6s)
        await page.screenshot(path=str(SHOTS / "10_hip_rifle_after_intro.png"), timeout=120000)
        print(f"shot1 {time.time()-t0:.1f}s")

        await page.mouse.down(button="right"); await page.wait_for_timeout(800)
        await page.screenshot(path=str(SHOTS / "11_ads_rifle_closeup.png"), timeout=120000)
        await page.mouse.up(button="right")

        await page.mouse.down(button="left"); await page.wait_for_timeout(120); await page.mouse.up(button="left")
        await page.wait_for_timeout(80)
        await page.screenshot(path=str(SHOTS / "12_fire_flash.png"), timeout=120000)

        await page.keyboard.press("r")
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(SHOTS / "13_reload_mid.png"), timeout=120000)
        await page.wait_for_timeout(2200)
        await page.screenshot(path=str(SHOTS / "14_reload_done.png"), timeout=120000)

        await page.keyboard.press("2")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(SHOTS / "15_switch_mid.png"), timeout=120000)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(SHOTS / "16_pistol_hip.png"), timeout=120000)

        await page.mouse.down(button="right"); await page.wait_for_timeout(800)
        await page.screenshot(path=str(SHOTS / "17_ads_pistol_closeup.png"), timeout=120000)
        await page.mouse.up(button="right")

        print("console errors:", errors if errors else "NONE")
        print("http >=400:", notfound if notfound else "NONE")
        await browser.close()

asyncio.run(main())
