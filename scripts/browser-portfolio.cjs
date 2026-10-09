// Real-browser smoke checks for mobile and desktop. Runs in GitHub Actions.
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = process.cwd();
const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png"};
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://localhost");
    const pathname = u.pathname === "/" ? "/index.html" : decodeURIComponent(u.pathname);
    const target = path.resolve(root, "." + pathname);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(target);
    res.writeHead(200, {"content-type":types[path.extname(target)] || "application/octet-stream"});
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
async function test() {
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  const url = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
  await fs.mkdir("artifacts", {recursive:true});
  try {
    for (const spec of [
      {name:"mobile-390",width:390,height:844,isMobile:true},
      {name:"desktop-1366",width:1366,height:900,isMobile:false}
    ]) {
      const context = await browser.newContext({viewport:{width:spec.width,height:spec.height},isMobile:spec.isMobile,hasTouch:spec.isMobile,deviceScaleFactor:1,reducedMotion:"reduce"});
      // Media bytes are unchanged and checked statically. Avoid loading large campaign videos during screenshot QA.
      await context.route("**/*.mp4", route => route.abort());
      await context.route("**/tracker.metricool.com/**", route => route.abort());
      const page = await context.newPage();
      const pageErrors=[];
      page.on("pageerror",e=>pageErrors.push(e.message));
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
      await page.locator(".hero-cta-primary").waitFor({state:"visible",timeout:15000});
      const state=await page.evaluate(() => ({
        title:document.querySelector("h1")?.innerText?.replace(/\s+/g," ").trim(),
        projects:!!document.querySelector("#projects"),
        caseStudy:!!document.querySelector("#caseMyWay .case-study-video"),
        packCount:document.querySelectorAll("#launchOffer .pricing-pack").length,
        ctaCount:document.querySelectorAll("#launchOffer .pricing-pack-cta").length,
        css:getComputedStyle(document.querySelector(".hero-cta-primary")).backgroundColor,
        heroMuted:document.querySelector(".hero-video").muted,
        deliveryStepWidth:document.querySelector(".deliverable-step").getBoundingClientRect().width,
        railWidth:document.querySelector("#pricingPackRail").clientWidth,
        railScroll:document.querySelector("#pricingPackRail").scrollLeft,
        mainWidth:document.querySelector("main").getBoundingClientRect().width,
        innerWidth:window.innerWidth
      }));
      assert.equal(state.packCount,3,"Three packs rendered");
      assert.equal(state.ctaCount,3,"Three pack CTAs rendered");
      assert.ok(state.projects && state.caseStudy,"Projects and featured case must be in DOM");
      assert.equal(state.css,"rgb(207, 230, 90)","Accent stylesheet must load");
      assert.equal(state.heroMuted,true,"Hero is muted by default");
      assert.ok(state.mainWidth <= state.innerWidth+4,"Main must fit viewport");
      if (spec.isMobile) assert.ok(state.deliveryStepWidth >= 130,"Mobile deliverable steps must be readable");
      await page.screenshot({path:"artifacts/"+spec.name+".png",fullPage:true,animations:"disabled"});
      if (spec.isMobile) {
        const first=await page.locator("#pricingPackRail").evaluate(el=>el.scrollLeft);
        await page.waitForTimeout(5000);
        const second=await page.locator("#pricingPackRail").evaluate(el=>el.scrollLeft);
        assert.ok(Math.abs(first-second)<3,"Mobile pricing must not advance automatically");
        await page.locator("#menuToggle").click();
        assert.ok(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("is-open")),"Mobile nav must open");
      }
      await page.locator('[data-filter="product"]').click();
      assert.ok(await page.locator('.project-item[data-category="product"]:not(.is-hidden)').count()>0,"Project filter must work");
      // Page-error report is informational: third-party video/CDN failures are tested separately.
      console.log(JSON.stringify({viewport:spec.name,...state,pageErrors:pageErrors.slice(0,6)}));
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
test().catch(err=>{console.error(err);process.exitCode=1;server.close();});
