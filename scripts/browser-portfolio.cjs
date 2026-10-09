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
      {name:"mobile-375",width:375,height:812,isMobile:true},
      {name:"mobile-390",width:390,height:844,isMobile:true},
      {name:"desktop-1366",width:1366,height:900,isMobile:false},
      {name:"desktop-1920",width:1920,height:1080,isMobile:false}
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
        clippedDecisionLabels:[...document.querySelectorAll(".editorial-decisions b")].filter(el=>el.scrollWidth>el.clientWidth+1).length,
        premiumCaseCount:document.querySelectorAll(".editorial-case").length,
        methodSteps:document.querySelectorAll("#method .method-brief-grid > article").length,
        methodWidth:document.querySelector("#method .method-brief-stage")?.getBoundingClientRect().width,
        methodContainerWidth:document.querySelector("#method > .site-shell")?.getBoundingClientRect().width,
        sectionOrder:[...document.querySelectorAll("main section[id]")].map(el=>el.id),
        systemMap:!!document.querySelector("#system .studio-system-map"),
        systemStepCount:document.querySelectorAll("#system .studio-system-sequence li").length,
        systemToolCount:document.querySelectorAll("#system .studio-system-toolgrid > div").length,
        systemBoardWidth:document.querySelector("#system .studio-system-board")?.getBoundingClientRect().width,
        systemBoardContainer:document.querySelector("#system > .site-shell")?.getBoundingClientRect().width,
        systemCta:document.querySelector("#system .studio-system-cta")?.getAttribute("href"),
        editorialHeadings:[...document.querySelectorAll(".editorial-case h4")].map(n=>n.innerText),
        premiumLinks:[...document.querySelectorAll(".editorial-project-link")].map(n=>n.getAttribute("href")),
        deliveryStepWidth:document.querySelector(".deliverable-step").getBoundingClientRect().width,
        railWidth:document.querySelector("#pricingPackRail").clientWidth,
        railScroll:document.querySelector("#pricingPackRail").scrollLeft,
        mainWidth:document.querySelector("main").getBoundingClientRect().width,
        innerWidth:window.innerWidth
      }));
      assert.equal(await page.locator(".editorial-play-control").count(),2,"Both editorial cases have explicit player controls");
      assert.equal(state.clippedDecisionLabels,0,"Case decision labels must fit available grid columns");
      assert.equal(state.premiumCaseCount,2,"Two new curated case chapters and My Way must render");
      assert.equal(state.editorialHeadings.length,2,"Curated editorial headings must render");
      assert.ok(state.premiumLinks.every(x=>x==="#projectFilters"),"Curated internal links must resolve");
      assert.equal(await page.locator("#caseMyWay .case-study-reference").count(),1,"Original My Way reference must be linked from featured case");
      assert.equal(await page.locator("#caseMyWay .case-study-reference").getAttribute("href"),"https://www.instagram.com/p/Dd24xgrOr5e/?hl=en","Original reference URL must be unchanged");
      assert.equal(await page.locator('.project-item[data-category="workflow"]').count(),0,"Workflow gallery card must be removed");
      assert.equal(await page.locator('[data-filter="workflow"]').count(),0,"Workflow gallery tab must be removed");
      assert.equal(await page.locator('.tab-btn[data-filter]').count(),2,"UGC and product filters remain");
      assert.deepEqual(state.sectionOrder,["top","projects","caseMyWay","services","launchOffer","system","method","contact"],"Cold-traffic narrative order");
      assert.equal(state.methodSteps,3,"Method simplified to three commercial collaboration steps");
      assert.ok(state.methodWidth<=state.innerWidth+2,"Method stage fits viewport");
      assert.ok(state.methodWidth<=state.methodContainerWidth+2,"Method stage fits its container");
      assert.ok(state.systemMap,"Dedicated production system is visible in DOM");
      assert.equal(state.systemStepCount,4,"Four studio system phases");
      assert.equal(state.systemToolCount,3,"Three functional tool groups");
      assert.equal(state.systemCta,"#contact","Contact CTA must stay internal");
      assert.ok(state.systemBoardWidth <= state.innerWidth+2,"System diagram must fit viewport");
      assert.ok(state.systemBoardWidth <= state.systemBoardContainer+2,"System diagram must fit site-shell");
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
      const playButton=page.locator(".editorial-play-control").first();
      await playButton.click();
      const videoIsMuted=await playButton.evaluate(button=>button.parentElement.querySelector("video").muted);
      assert.ok(videoIsMuted,"Manual preview must not enable audio");
      await page.locator('[data-filter="ugc"]').click();
      assert.ok(await page.locator('.project-item[data-category="ugc"]:not(.is-hidden)').count()>0,"UGC filter remains functional");
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
