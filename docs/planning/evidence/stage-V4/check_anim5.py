import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path("/tmp/browser/v4-phase")

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:8080/play", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        btn = page.get_by_role("button", name="Assumir o controle")
        box = await btn.bounding_box()
        await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        await page.wait_for_timeout(45000)
        info = await page.evaluate("""() => {
          const scene = window.__obScene, director = window.__obDirector;
          if (!scene) return { noScene: true };
          let skinned = 0, hitboxes = 0, gunMeshes = 0;
          scene.traverse(o => {
            if (o.isSkinnedMesh) skinned++;
            if (o.isMesh && o.userData && o.userData.enemyId != null && o.userData.zone) hitboxes++;
            if (o.isMesh && o.material && o.material.metalness > 0.5 && o.geometry?.parameters?.depth >= 0.3) gunMeshes++;
          });
          const enemies = director?.enemies ?? [];
          const states = enemies.map(e => ({
            id: e.spawn?.id ?? e.id ?? null,
            visualReady: e.visual?.ready ?? null,
            action: e.visual?.current ?? null,
            dead: e.visual?.dead ?? null,
            hitboxes: e.visual?.hitboxes?.length ?? 0,
            state: e.state ?? null,
          }));
          return { skinned, hitboxes, gunMeshes, enemyCount: enemies.length, states };
        }""")
        print(info)
        await page.wait_for_timeout(20000)
        info2 = await page.evaluate("""() => {
          const scene = window.__obScene, director = window.__obDirector;
          if (!scene) return { noScene: true };
          const enemies = director?.enemies ?? [];
          const states = enemies.map(e => ({
            id: e.spawn?.id ?? e.id ?? null,
            visualReady: e.visual?.ready ?? null,
            action: e.visual?.current ?? null,
            dead: e.visual?.dead ?? null,
            hitboxes: e.visual?.hitboxes?.length ?? 0,
            state: e.state ?? null,
            pos: e.root ? { x: +e.root.position.x.toFixed(1), z: +e.root.position.z.toFixed(1) } : null,
          }));
          return { enemyCount: enemies.length, states };
        }""")
        print(info2)
        print("CONSOLE_ERRORS:", len(errors))
        for e in errors[:10]:
            print("ERR:", e[:300])
        await browser.close()

asyncio.run(main())
