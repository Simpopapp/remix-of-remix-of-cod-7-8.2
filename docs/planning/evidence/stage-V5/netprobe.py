import asyncio
from playwright.async_api import async_playwright

async def main():
    bad = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        page.on("response", lambda r: bad.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        await page.goto("http://localhost:8080/play", wait_until="domcontentloaded")
        await page.wait_for_timeout(12000)
        for u in bad: print(u)
        if not bad: print("NONE")
        await browser.close()

asyncio.run(main())
