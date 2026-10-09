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
      await page.locator(".hero-summary-minimal-copy").waitFor({state:"visible",timeout:15000});
      const state=await page.evaluate(() => ({
        title:document.querySelector("h1")?.innerText?.replace(/\s+/g," ").trim(),
        projects:!!document.querySelector("#projects"),
        caseStudy:!!document.querySelector("#caseMyWay .case-study-video"),
        packCount:document.querySelectorAll("#launchOffer .pricing-pack").length,
        ctaCount:document.querySelectorAll("#launchOffer .pricing-pack-cta").length,
        css:getComputedStyle(document.querySelector(".studio-system-dot")).backgroundColor,
        heroActionCount:document.querySelectorAll("#top .hero-actions a").length,
        systemAmbientCount:document.querySelectorAll("#system .studio-system-ambient").length,
        systemAmbientMuted:document.querySelector("#system .studio-system-ambient")?.muted,
        systemAmbientPreload:document.querySelector("#system .studio-system-ambient")?.preload,
        systemAmbientDisplay:getComputedStyle(document.querySelector("#system .studio-system-ambient")).display,
        systemScrim:getComputedStyle(document.querySelector("#system .studio-system-board"),"::before").backgroundImage,
        heroMuted:document.querySelector(".hero-video").muted,
        clippedDecisionLabels:[...document.querySelectorAll(".editorial-decisions b")].filter(el=>el.scrollWidth>el.clientWidth+1).length,
        premiumCaseCount:document.querySelectorAll(".editorial-case").length,
        archiveTotal:document.querySelectorAll("#projectGrid .project-item").length,
        archiveUGC:document.querySelectorAll('#projectGrid .project-item[data-category="ugc"]').length,
        archiveProduct:document.querySelectorAll('#projectGrid .project-item[data-category="product"]').length,
        noirSources:document.querySelectorAll('source[src*="cc882a72-3df6-41a3-8398-619e1e7ba9a9.mp4"]').length,
        ugcPerfumeSources:document.querySelectorAll('source[src*="d5ea268d-4d9f-4c93-9139-439d4b8ace03.mp4"]').length,
        methodSteps:document.querySelectorAll("#method .method-brief-grid > article").length,
        methodWidth:document.querySelector("#method .method-brief-stage")?.getBoundingClientRect().width,
        methodContainerWidth:document.querySelector("#method > .site-shell")?.getBoundingClientRect().width,
        sectionOrder:[...document.querySelectorAll("main section[id]")].map(el=>el.id),
        systemMap:!!document.querySelector("#system .studio-system-map"),
        systemStepCount:document.querySelectorAll("#system .studio-system-sequence li").length,
        systemToolCount:document.querySelectorAll("#system .studio-system-toolgrid > div").length,
        toolNames:[...document.querySelectorAll("#system .tool-app-name")].map(e=>e.textContent.trim()),
        localIconPaths:[...document.querySelectorAll("#system .tool-app-logo img")].map(img=>img.getAttribute("src")),
        pipelineCards:document.querySelectorAll("#system .tool-pipeline-card").length,
        toolGridWidth:document.querySelector("#system .studio-system-toolgrid")?.getBoundingClientRect().width,
        toolCardsWithinViewport:[...document.querySelectorAll("#system .tool-pipeline-card")].every(el=>{const r=el.getBoundingClientRect();return r.left>=-2&&r.right<=innerWidth+2;}),

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

      const navState=await page.evaluate(() => {
        const $=selector=>document.querySelector(selector);
        const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,center:r.left+r.width/2,width:r.width,top:r.top,bottom:r.bottom};};
        const header=$("#portfolioHeader");
        const home=header.querySelector(".portfolio-nav-home");
        const brand=header.querySelector(".portfolio-nav-brand");
        const nav=header.querySelector(".portfolio-nav-links");
        const contact=header.querySelector(".portfolio-nav-contact");
        const toggle=$("#menuToggle");
        const headerRect=rect(header);
        return {
          home:rect(home),brand:rect(brand),nav:rect(nav),contact:rect(contact),toggle:rect(toggle),
          header:headerRect,
          viewportWidth:innerWidth,
          mainLinks:[...nav.querySelectorAll("a")].map(el=>el.getAttribute("href")),
          navDisplay:getComputedStyle(nav).display,
          contactDisplay:getComputedStyle(contact).display,
          toggleDisplay:getComputedStyle(toggle.parentElement).display,
          homeCount:document.querySelectorAll(".portfolio-nav-home").length,
          brandCount:document.querySelectorAll(".portfolio-nav-brand").length,
          legacyReturnCount:document.querySelectorAll(".home-return").length
        };
      });
      assert.equal(await page.locator("#portfolio-nav-critical").count(),1,"Inline critical header styles survive external CSS cache");
      assert.equal(navState.header.top,0,"Navigation fixed to viewport top");
      assert.ok(navState.header.width>=spec.width-2,"Navigation spans entire viewport");
      assert.equal(navState.homeCount,1,"One integrated Inicio link");
      assert.equal(navState.brandCount,1,"One brand link");
      assert.equal(navState.legacyReturnCount,0,"No overlapping fixed Inicio overlay");
      assert.deepEqual(navState.mainLinks,["#projects","#system","#services","#launchOffer"],"All central links preserved");
      if(spec.width>=1100){
        assert.notEqual(navState.navDisplay,"none","Desktop displays the centered section links");
        assert.notEqual(navState.contactDisplay,"none","Desktop displays the Hablemos CTA");
        assert.equal(navState.toggleDisplay,"none","Desktop hides hamburger");
        assert.ok(Math.abs(navState.nav.center-spec.width/2)<3,"Desktop section links exactly centered in viewport");
        assert.ok(navState.home.right < navState.brand.left,"Inicio and brand have clear spacing");
        assert.ok(navState.brand.right+8 < navState.nav.left,"Brand does not overlap links");
        assert.ok(navState.nav.right+8 < navState.contact.left,"Links do not overlap the CTA");
      } else {
        assert.equal(navState.navDisplay,"none","Mobile/tablet hides desktop section links");
        assert.equal(navState.contactDisplay,"none","Mobile/tablet keeps CTA inside the menu");
        assert.notEqual(navState.toggleDisplay,"none","Mobile/tablet displays menu toggle");
        assert.ok(Math.abs(navState.brand.center-spec.width/2)<3,"Mobile brand mathematically centered");
        assert.ok(navState.home.right+5 < navState.brand.left,"Inicio and centered brand do not overlap");
        assert.ok(navState.brand.right+5 < navState.toggle.left,"Brand and hamburger do not overlap");
        assert.equal(await page.locator("#mobileMenu").evaluate(el=>getComputedStyle(el).visibility),"hidden","Mobile menu links are not focusable while closed");
      }
      await page.locator("#portfolioHeader").screenshot({path:"artifacts/nav-"+spec.name+".png",animations:"disabled"});

      assert.equal(await page.locator(".editorial-play-control").count(),2,"Both editorial cases have explicit player controls");
      assert.equal(state.clippedDecisionLabels,0,"Case decision labels must fit available grid columns");
      assert.equal(state.premiumCaseCount,2,"Two new curated case chapters and My Way must render");
      assert.equal(state.archiveTotal,4,"Archive contains four non-duplicated projects");
      assert.equal(state.archiveUGC,2,"UGC archive retains two distinct pieces");
      assert.equal(state.archiveProduct,2,"Campaign archive retains two distinct pieces");
      assert.equal(state.noirSources,1,"NOIR video is only present in its featured banner");
      assert.equal(state.ugcPerfumeSources,1,"Beauty perfume UGC video is only present in its featured banner");
      assert.equal(state.editorialHeadings.length,2,"Curated editorial headings must render");
      assert.deepEqual(state.premiumLinks,[],"No redundant editorial gallery CTAs remain");
      assert.equal(await page.locator(".editorial-project-link").count(),0,"Remove the remaining editorial gallery button");
      assert.equal(await page.locator("#projectFilters").count(),1,"Keep the gallery filters section");
      assert.equal(await page.locator("#caseMyWay .case-study-reference").count(),0,"Requested original-reference CTA removed");
      assert.equal(await page.getByText("Explorar otros formatos",{exact:true}).count(),0,"Requested editorial CTA removed");
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
      assert.equal(state.pipelineCards,3,"Three new functional tool cards");
      assert.deepEqual(state.toolNames,["ChatGPT","Nano Banana Pro","Higgsfield Soul","Omni 1.1 Flash","Google Flow Labs","Python","CapCut","Canva"],"Exact functional tool order");
      assert.equal(await page.locator("#system .tool-pipeline-direction .tool-app").count(),3,"Direction shows ChatGPT, Nano and Soul");
      assert.equal(await page.locator("#system .tool-pipeline-generation .tool-app").count(),2,"Generation shows Omni and Google Flow Labs");
      assert.equal(await page.locator("#system .tool-pipeline-finishing .tool-app").count(),3,"Finishing has three icons");
      const alignment=await page.locator("#system .tool-pipeline-generation .tool-apps").evaluate(el=>{
        const items=[...el.querySelectorAll(".tool-app")].map(x=>x.getBoundingClientRect());
        const container=el.getBoundingClientRect();
        const usedLeft=items[0].left-container.left;
        const usedRight=container.right-items[items.length-1].right;
        return {usedLeft,usedRight,width:container.width};
      });
      assert.ok(Math.abs(alignment.usedLeft-alignment.usedRight)<4,"Two generation logos are horizontally centered");
      assert.equal(new Set(state.localIconPaths).size,8,"Eight unique local SVG assets");
      assert.ok(state.localIconPaths.every(x=>x.startsWith("./assets/tool-icons/")),"Logos self-hosted");
      assert.ok(state.toolCardsWithinViewport,"No tool card horizontally clips");
      assert.ok(state.toolGridWidth<=state.innerWidth+2,"Tool grid fits viewport");

      assert.equal(state.systemCta,"#contact","Contact CTA must stay internal");
      assert.ok(state.systemBoardWidth <= state.innerWidth+2,"System diagram must fit viewport");
      assert.ok(state.systemBoardWidth <= state.systemBoardContainer+2,"System diagram must fit site-shell");
      assert.equal(state.packCount,3,"Three packs rendered");
      assert.equal(state.ctaCount,3,"Three pack CTAs rendered");
      assert.ok(state.projects && state.caseStudy,"Projects and featured case must be in DOM");
      assert.equal(state.css,"rgb(207, 230, 90)","Accent system styling must load");
      assert.equal(state.heroActionCount,0,"Requested hero CTA pair removed");
      assert.equal(state.systemAmbientCount,1,"One ambient system backdrop");
      assert.equal(state.systemAmbientMuted,true,"Ambient system backdrop always muted");
      assert.ok(state.systemScrim.includes("linear-gradient"),"Dark overlay preserves readable contrast");
      assert.equal(state.systemAmbientDisplay,"none","Reduced-motion browser should hide background video");
      assert.equal(state.systemAmbientPreload,"none","Reduced-motion browser should not fetch background video");
      assert.equal(state.heroMuted,true,"Hero is muted by default");
      assert.ok(state.mainWidth <= state.innerWidth+4,"Main must fit viewport");
      if (spec.isMobile) assert.ok(state.deliveryStepWidth >= 130,"Mobile deliverable steps must be readable");
      await page.screenshot({path:"artifacts/"+spec.name+".png",fullPage:true,animations:"disabled"});

      // An additional real-animation CSS pass: the baseline QA uses reduced motion and
      // would otherwise hide the video in every screenshot.

      await page.locator("#system .studio-system-toolgrid").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll("#system .tool-app-logo img")].every(el=>el.complete && el.naturalWidth>0),{timeout:12000});
      assert.equal(await page.locator("#system .tool-app-logo img").count(),8,"Tool logos render in all viewports");
      const disabledWave=await page.locator("#system .tool-pipeline-card").first().evaluate(el=>getComputedStyle(el,"::before").animationName);
      assert.equal(disabledWave,"none","Reduced motion disables RGB wave");
      await page.locator("#system .studio-system-toolgrid").screenshot({path:"artifacts/stack-tools-"+spec.name+".png",animations:"disabled"});
      await page.emulateMedia({reducedMotion:"no-preference"});
      const activeWave=await page.locator("#system .tool-pipeline-card").first().evaluate(el=>getComputedStyle(el,"::before").animationName);
      assert.ok(activeWave.includes("tool-pipeline-border-wave"),"RGB wave enabled in normal motion");
      await page.locator("#system .studio-system-board").scrollIntoViewIfNeeded();
      await page.waitForTimeout(450);
      const cinematic=await page.evaluate(() => {
        const board=document.querySelector("#system .studio-system-board");
        const video=document.querySelector("#system .studio-system-ambient");
        const panel=document.querySelector("#system .studio-system-panel");
        const active=getComputedStyle(video);
        return {
          videoDisplay:active.display,
          videoOpacity:Number(active.opacity),
          scrim:getComputedStyle(board,"::before").backgroundImage,
          atmosphere:getComputedStyle(board,"::after").backgroundImage,
          atmosphereAnimation:getComputedStyle(board,"::after").animationName,
          panelBackground:getComputedStyle(panel).backgroundColor,
          border:getComputedStyle(board).borderColor,
          width:board.getBoundingClientRect().width
        };
      });
      assert.notEqual(cinematic.videoDisplay,"none","Normal motion must reveal the ambient video layer");
      assert.ok(cinematic.videoOpacity>=.64,"Cinematic layer should be visually perceptible");
      assert.ok(cinematic.scrim.includes("linear-gradient"),"Readable cinematic scrim must remain");
      assert.ok(cinematic.atmosphere.includes("radial-gradient"),"Decorative fallback must remain visible without video bytes");
      assert.ok(cinematic.atmosphereAnimation.includes("studio-system-atmosphere"),"Controlled atmospheric layer active");
      assert.ok(cinematic.width<=spec.width+2,"Cinematic system card stays inside viewport");
      await page.locator("#system .studio-system-board").screenshot({path:"artifacts/system-cinematic-"+spec.name+".png",animations:"disabled"});
      await page.emulateMedia({reducedMotion:"reduce"});
      assert.equal(await page.locator("#system .studio-system-ambient").evaluate(el=>getComputedStyle(el).display),"none","Reduced motion still hides ambient video");
      console.log(JSON.stringify({cinematicViewport:spec.name,...cinematic}));

      if (spec.isMobile) {
        const first=await page.locator("#pricingPackRail").evaluate(el=>el.scrollLeft);
        await page.waitForTimeout(5000);
        const second=await page.locator("#pricingPackRail").evaluate(el=>el.scrollLeft);
        assert.ok(Math.abs(first-second)<3,"Mobile pricing must not advance automatically");
        await page.locator("#menuToggle").click();
        assert.ok(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("is-open")),"Mobile nav must open");
        assert.equal(await page.locator("#mobileMenu").evaluate(el=>getComputedStyle(el).visibility),"visible","Menu becomes accessible when open");
        assert.deepEqual(await page.locator("#mobileMenu a").evaluateAll(nodes=>nodes.map(el=>el.getAttribute("href"))),["#projects","#system","#services","#launchOffer","#contact"],"Mobile links preserved");
        await page.locator('#mobileMenu a[href="#system"]').click();
        assert.ok(!(await page.locator("#mobileMenu").evaluate(el=>el.classList.contains("is-open"))),"Menu closes after navigation");

      }
      const playButton=page.locator(".editorial-play-control").first();
      await playButton.click();
      const videoIsMuted=await playButton.evaluate(button=>button.parentElement.querySelector("video").muted);
      assert.ok(videoIsMuted,"Manual preview must not enable audio");
      await page.locator('[data-filter="ugc"]').click();
      assert.equal(await page.locator('.project-item[data-category="ugc"]:not(.is-hidden)').count(),2,"UGC filter displays the two unique cards");
      await page.locator('[data-filter="product"]').click();
      assert.equal(await page.locator('.project-item[data-category="product"]:not(.is-hidden)').count(),2,"Campaign filter displays the two unique cards");
      // Page-error report is informational: third-party video/CDN failures are tested separately.
      console.log(JSON.stringify({viewport:spec.name,...state,pageErrors:pageErrors.slice(0,6)}));
      await context.close();
    }

    // Regression: emulate a browser holding the older premium stylesheet.
    // The navbar must still be correctly laid out from critical styles in HTML.
    const cachedPremiumCss=(await fs.readFile("assets/premium-lab.css","utf8")).split("/* Unified navigation / 2026-10-09")[0];
    assert.ok(cachedPremiumCss.length>20000,"Legacy stylesheet cache fixture must be realistic");
    for (const staleSpec of [{name:"desktop-stale-css",width:1366,height:900},{name:"mobile-stale-css",width:390,height:844}]) {
      const staleContext=await browser.newContext({viewport:{width:staleSpec.width,height:staleSpec.height},reducedMotion:"reduce"});
      await staleContext.route("**/assets/premium-lab.css*",route=>route.fulfill({status:200,contentType:"text/css",body:cachedPremiumCss}));
      await staleContext.route("**/*.mp4",route=>route.abort());
      const page=await staleContext.newPage();
      try {
        await page.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
        const freshHeader=await page.evaluate(()=>{
          const b=document.querySelector("#portfolioHeader"),r=b.getBoundingClientRect();
          const el=sel=>document.querySelector("#portfolioHeader "+sel).getBoundingClientRect();
          const center=rect=>rect.left+rect.width/2;
          const brand=el(".portfolio-nav-brand"),nav=el(".portfolio-nav-links"),home=el(".portfolio-nav-home"),cta=el(".portfolio-nav-contact"),toggle=el(".portfolio-nav-menu-button");
          return {height:r.height,width:r.width,top:r.top,brandCenter:center(brand),navCenter:center(nav),homeRight:home.right,navLeft:nav.left,navRight:nav.right,ctaLeft:cta.left,toggleLeft:toggle.left,brandLeft:brand.left,brandRight:brand.right};
        });
        assert.ok(freshHeader.height>=60&&freshHeader.height<=80,"Old cached stylesheet must not create a tall stacked header");
        assert.equal(freshHeader.top,0,"Fixed nav remains at top with cached CSS");
        assert.ok(freshHeader.width>=staleSpec.width-2,"Nav remains full width with cached CSS");
        if(staleSpec.width>=1100){
          assert.ok(Math.abs(freshHeader.navCenter-staleSpec.width/2)<3,"Desktop nav centered with stale stylesheet");
          assert.ok(freshHeader.brandRight+8 < freshHeader.navLeft,"Brand and nav separated despite stale stylesheet");
          assert.ok(freshHeader.navRight+8 < freshHeader.ctaLeft,"CTA right aligned despite stale stylesheet");
        } else {
          assert.ok(Math.abs(freshHeader.brandCenter-staleSpec.width/2)<3,"Mobile brand centered with stale stylesheet");
          assert.ok(freshHeader.homeRight+5 < freshHeader.brandLeft,"Mobile home does not overlap brand with cached CSS");
          assert.ok(freshHeader.brandRight+5 < freshHeader.toggleLeft,"Mobile brand does not overlap menu with cached CSS");
        }
        await page.locator("#portfolioHeader").screenshot({path:"artifacts/nav-"+staleSpec.name+".png",animations:"disabled"});
        console.log(JSON.stringify({navbarStaleCss:staleSpec.name,...freshHeader}));
      } finally {
        await staleContext.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
test().catch(err=>{console.error(err);process.exitCode=1;server.close();});
