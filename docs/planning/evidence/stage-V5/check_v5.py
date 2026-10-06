import asyncio
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

        await page.goto("http://localhost:8080/play", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOTS / "01_initial.png"))

        # pointer lock via click
        await page.get_by_role("button", name="Assumir o controle").click()
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(SHOTS / "02_locked_hip_rifle.png"))

        # ADS hold (right mouse)
        await page.mouse.down(button="right")
        await page.wait_for_timeout(700)
        await page.screenshot(path=str(SHOTS / "03_ads_rifle.png"))
        await page.mouse.up(button="right")

        # fire a shot to see flipbook flash + casing
        await page.mouse.down(button="left")
        await page.wait_for_timeout(120)
        await page.mouse.up(button="left")
        await page.wait_for_timeout(80)
        await page.screenshot(path=str(SHOTS / "04_fire_flash.png"))

        # reload (R) - mid animation shot
        await page.keyboard.press("r")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(SHOTS / "05_reload_mid.png"))
        await page.wait_for_timeout(2000)
        await page.screenshot(path=str(SHOTS / "06_reload_done.png"))

        # switch weapon (2) - mid transition
        await page.keyboard.press("2")
        await page.wait_for_timeout(250)
        await page.screenshot(path=str(SHOTS / "07_switch_mid.png"))
        await page.wait_for_timeout(900)
        await page.screenshot(path=str(SHOTS / "08_pistol_hip.png"))

        # ADS pistol
        await page.mouse.down(button="right")
        await page.wait_for_timeout(700)
        await page.screenshot(path=str(SHOTS / "09_ads_pistol.png"))
        await page.mouse.up(button="right")

        print("console errors:", errors if errors else "NONE")
        await browser.close()

asyncio.run(main())
