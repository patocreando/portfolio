// Real-browser smoke checks for mobile and desktop. Runs in GitHub Actions.
const { chromium } = require("playwright");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = process.cwd();
const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp"};
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
  const browser = await chromium.launch({
    headless:true,
    args:["--no-sandbox"],
    ...(process.env.PLAYWRIGHT_CHROME_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROME_PATH} : {})
  });
  await fs.mkdir("artifacts", {recursive:true});
  try {
    for (const spec of [
      {name:"mobile-375",width:375,height:812,isMobile:true},
      {name:"mobile-390",width:390,height:844,isMobile:true},
      {name:"tablet-1200",width:1200,height:900,isMobile:false},
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
        caseStudy:!!document.querySelector("#caseMyWay [data-club-viewer]"),
        clubStepCount:document.querySelectorAll("#caseMyWay [data-club-step]").length,
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
        siloFeaturedSources:document.querySelectorAll('source[src*="silo-campana-producto-recortado.mp4"]').length,
        siloGallerySources:document.querySelectorAll('source[src*="silo-ugc-sin-subtitulos.mp4"]').length,
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
        deliveryStepWidth:document.querySelector("#caseMyWay .club-workflow-step")?.getBoundingClientRect().width,
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
      if(spec.width>=1300){
        assert.notEqual(navState.navDisplay,"none","Desktop displays the centered section links");
        assert.notEqual(navState.contactDisplay,"none","Desktop displays the Hablemos CTA");
        assert.equal(navState.toggleDisplay,"none","Desktop hides hamburger");
        assert.ok(Math.abs(navState.brand.center-spec.width/2)<3,"Desktop logo exactly centered in viewport");
        assert.ok(navState.home.right+8 <= navState.nav.left,"Home and section links have clear spacing (>= 8px)");
        assert.ok(navState.nav.right+8 < navState.brand.left,"Links do not overlap centered logo");
        assert.ok(navState.brand.right+8 < navState.contact.left,"Centered logo does not overlap the CTA");
      } else {
        assert.equal(navState.navDisplay,"none","Mobile/tablet hides desktop section links");
        assert.equal(navState.contactDisplay,"none","Mobile/tablet keeps CTA inside the menu");
        assert.notEqual(navState.toggleDisplay,"none","Mobile/tablet displays menu toggle");
        assert.ok(Math.abs(navState.brand.center-spec.width/2)<3,"Mobile brand mathematically centered");
        assert.ok(navState.home.right+8 <= navState.brand.left,"Mobile home and centered brand maintain minimum 8px separation");
        assert.ok(navState.brand.right+8 <= navState.toggle.left,"Mobile brand and menu toggle maintain minimum 8px separation");
        assert.equal(await page.locator("#mobileMenu").evaluate(el=>getComputedStyle(el).visibility),"hidden","Mobile menu links are not focusable while closed");
      }
      await page.locator("#portfolioHeader").screenshot({path:"artifacts/nav-"+spec.name+".png",animations:"disabled"});
      // Check the skip link in ordinary, unfocused state and when keyboard-focused.
      const skip=page.locator(".skip-link");
      const skipBefore=await skip.evaluate(el=>{
        const rect=el.getBoundingClientRect();
        return {bottom:rect.bottom,top:rect.top,focused:document.activeElement===el,transform:getComputedStyle(el).transform};
      });
      console.log(JSON.stringify({skipLinkInitial:spec.name,...skipBefore}));
      if(!skipBefore.focused)assert.ok(skipBefore.bottom<=2,"Skip link is outside the viewport until focused");
      await skip.focus();
      assert.ok(await skip.evaluate(el=>el.getBoundingClientRect().top>=0),
        "Skip link appears when keyboard focused");
      await skip.evaluate(el=>el.blur());
      await page.waitForTimeout(250);
      const skipAfter=await skip.evaluate(el=>({bottom:el.getBoundingClientRect().bottom,focused:document.activeElement===el}));
      assert.ok(!skipAfter.focused && skipAfter.bottom<=2,"Skip link returns outside viewport after focus leaves");


      assert.equal(await page.locator(".editorial-play-control, .content-audio-toggle").count(),0,"Video controls stay off-screen");
      assert.equal(state.clippedDecisionLabels,0,"Case decision labels must fit available grid columns");
      assert.equal(state.premiumCaseCount,2,"Two distinct featured cases: SILO and Mariana");
      assert.equal(state.archiveTotal,4,"Archive contains four non-duplicated projects");
      assert.equal(state.archiveUGC,2,"UGC archive retains two distinct pieces");
      assert.equal(state.archiveProduct,2,"Campaign archive retains two distinct pieces");
      assert.equal(state.siloFeaturedSources,1,"First SILO ad appears in featured campaign");
       assert.equal(state.siloGallerySources,1,"Second SILO ad appears in campaign gallery");
      assert.equal(state.ugcPerfumeSources,0,"Retired external perfume UGC source stays excluded");
      assert.equal(state.editorialHeadings.length,2,"SILO and Mariana editorial headings must render");
      assert.equal(await page.locator(".editorial-case--mariana video[data-editorial-reel] source[src='./assets/videos/mariana-omelette-ugc.mp4']").count(),1,"Mariana has its own playable media");
      assert.equal(await page.locator(".editorial-case--mariana video[poster='./assets/images/mariana-omelette-ugc.webp']").count(),1,"Mariana has authentic poster");
      assert.equal(await page.locator(".editorial-case--mariana [data-video-audio-prompt]").count(),1,"Mariana audio has an accessible control");

      assert.deepEqual(state.premiumLinks,[],"No redundant editorial gallery CTAs remain");
      assert.equal(await page.locator(".editorial-project-link").count(),0,"Remove the remaining editorial gallery button");
      assert.equal(await page.locator("#projectFilters").count(),1,"Keep the gallery filters section");
      assert.equal(await page.locator("#caseMyWay .case-study-reference").count(),0,"Requested original-reference CTA removed");
      const clubTabs=page.locator("#caseMyWay [data-club-step]");
      assert.equal(await clubTabs.count(),4,"Four interactive Club stages");
      assert.equal(await page.locator("#caseMyWay video[controls]").count(),0,"No visible native video controls");
      assert.equal(await page.locator("#caseMyWay .club-workflow-video").count(),1,"One video element is reused for production and delivery");
      assert.equal(await page.locator("#caseMyWay .club-workflow-step[aria-selected='true'] .club-workflow-step-copy strong").textContent(),"Propuesta visual","Proposal is shown first");
      await clubTabs.nth(1).click();
      assert.equal(await page.locator("#caseMyWay .club-workflow-step[aria-selected='true'] .club-workflow-step-copy strong").textContent(),"Producción","Production step selected");
      assert.equal(await page.locator("#caseMyWay .club-workflow-video").isVisible(),true,"Generated scene is visible");
      assert.ok((await page.locator("#caseMyWay .club-workflow-video").getAttribute("src")).endsWith("generated-scene.mp4"),"Production uses its actual generated clip");
      const audioPrompt=page.locator("#caseMyWay [data-club-audio]");
      assert.equal(await audioPrompt.textContent().then(text=>text.trim()),"Escuchar audio","Audio control is concise and has no emoji");
      assert.equal(await audioPrompt.locator("svg").count(),1,"Audio control uses a drawn icon");
      await clubTabs.nth(2).click();
      assert.equal(await page.locator("#caseMyWay .club-workflow-step[aria-selected='true'] .club-workflow-step-copy strong").textContent(),"Edición","Edit step selected");
      assert.equal(await page.locator("#caseMyWay [data-club-edit]").isVisible(),true,"Editing mockup is visible");
      await clubTabs.nth(3).click();
      assert.equal(await page.locator("#caseMyWay .club-workflow-step[aria-selected='true'] .club-workflow-step-copy strong").textContent(),"Archivo final","Final delivery selected");
      assert.ok((await page.locator("#caseMyWay .club-workflow-video").getAttribute("src")).endsWith("club-del-coctel.mp4"),"Delivery stage reuses the unmodified final reel");
      const viewerMetrics=await page.locator("#caseMyWay [data-club-viewer]").evaluate(el=>{
        const area=el.getBoundingClientRect();
        const screen=el.querySelector(".club-workflow-screen").getBoundingClientRect();
        return {width:area.width,height:area.height,screenHeight:screen.height};
      });
      assert.ok(viewerMetrics.width <= spec.width + 2,"Club walkthrough fits viewport");
      assert.ok(viewerMetrics.height >= 500,"Interactive mockup has enough room to show the process");
      assert.ok(viewerMetrics.screenHeight >= 300,"Preview area remains large enough to see");
      await page.locator("#caseMyWay [data-club-viewer]").screenshot({path:"artifacts/club-workflow-"+spec.name+".png",animations:"disabled"});
      await clubTabs.first().click();
      assert.equal(await page.getByText("Explorar otros formatos",{exact:true}).count(),0,"Requested editorial CTA removed");
      assert.equal(await page.locator('.project-item[data-category="workflow"]').count(),0,"Workflow gallery card must be removed");
      assert.equal(await page.locator('[data-filter="workflow"]').count(),0,"Workflow gallery tab must be removed");
      assert.equal(await page.locator('.tab-btn[data-filter]').count(),2,"UGC and product filters remain");
      assert.deepEqual(state.sectionOrder,["top","projects","caseMyWay","services","launchOffer","system","method","contact"],"Cold-traffic narrative order");
      assert.equal(state.methodSteps,3,"Method simplified to three commercial collaboration steps");
      const terms=await page.locator("#method .method-brief-scope").evaluate(el=>{
        const box=el.getBoundingClientRect();
        return {text:el.textContent.trim().replace(/\s+/g," "),width:box.width,visible:getComputedStyle(el).display!=="none",boldSections:[...el.querySelectorAll("strong")].map(n=>n.textContent.trim())};
      });
      assert.equal(terms.text,"Alcance, revisiones y plazos de entrega: se definen por escrito luego de evaluar la complejidad del resumen del proyecto, la fidelidad de producto, las escenas y las piezas solicitadas. No se inicia la generación final hasta validar la propuesta visual y el presupuesto. Pago: se realiza al momento de la entrega final.","Explicit timeline and payment terms");
      assert.deepEqual(terms.boldSections,["Alcance, revisiones y plazos de entrega:","Pago:"],"Terms have clear hierarchy");
      assert.ok(terms.visible&&terms.width<=spec.width+2,"Terms fit on mobile and desktop");
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
      assert.equal(await page.locator('[aria-labelledby="siloCaseTitle"]').count(),1,"SILO editorial case is featured");
      assert.equal(await page.locator(".editorial-case-ls2").count(),0,"Unlicensed LS2 media is excluded from release");
      assert.equal(await page.locator(".project-item-piero").count(),0,"Unlicensed Piero media is excluded from release");
      await page.locator('[aria-labelledby="siloCaseTitle"]').screenshot({path:"artifacts/silo-featured-"+spec.name+".png",animations:"disabled"});
      // Keep independent before/after references for the second featured project.
      const marianaCase=page.locator(".editorial-case--mariana");
      assert.equal(await marianaCase.count(),1,"Mariana appears as one featured campaign");
      const marianaGeometry=await marianaCase.evaluate(el=>{
        const r=el.getBoundingClientRect(),video=el.querySelector("video"),v=video.getBoundingClientRect();
        return {width:r.width,left:r.left,right:r.right,videoWidth:v.width,videoHeight:v.height,
          poster:video.getAttribute("poster"),accessibleName:video.getAttribute("aria-label")};
      });
      assert.ok(marianaGeometry.left>=-2 && marianaGeometry.right<=spec.width+2,
        "Mariana case fits the viewport horizontally");
      assert.ok(marianaGeometry.videoWidth>180 && marianaGeometry.videoHeight>240,
        "Mariana showcase video has adequate size");
      assert.ok(marianaGeometry.accessibleName.includes("Mariana"),"Mariana retains descriptive video label");
      await marianaCase.screenshot({path:"artifacts/mariana-featured-"+spec.name+".png",animations:"disabled"});

      await page.locator('[data-filter="product"]').click();
      assert.equal(await page.locator('[data-filter="product"]').getAttribute("aria-selected"),"true","Product filter is selected");
      const siloCard=page.locator('#projectGrid .project-item--silo');
      assert.equal(await siloCard.count(),1,"Second SILO ad appears in product gallery");
      assert.equal(await siloCard.evaluate(el=>el.classList.contains("is-hidden")),false,"SILO ad becomes visible in product gallery");
      await siloCard.screenshot({path:"artifacts/silo-gallery-"+spec.name+".png",animations:"disabled"});
      await page.locator('[data-filter="ugc"]').click();
      assert.equal(await page.locator('[data-filter="ugc"]').getAttribute("aria-selected"),"true","UGC tab restored");
      assert.equal(await page.locator("#launchOffer .pricing-preproduction").count(),1,"Visual dashboard stage is present");
      assert.equal(state.packCount,3,"Three packs rendered");
      assert.equal(state.ctaCount,3,"Three pack CTAs rendered");
      assert.equal(await page.title(),"Pato Creando | Reels UGC y anuncios de producto con IA","Spanish title fits content strategy");
      assert.equal(await page.locator("#launchOffer .pricing-secondary-contact a[href='#contact']").count(),1,"Visitor can use contact form instead of Instagram");
      assert.equal(await page.locator("#submitLabel").textContent(),"Enviar consulta","Contact button invites a consultation");
      assert.equal(await page.locator("#contactForm .contact-brief-hint").count(),1,"Brief helper appears above form");
      const pricingTerms=await page.locator("#launchOffer .pricing-packs-disclaimer").evaluate(el=>{
        const rect=el.getBoundingClientRect();
        return {size:parseFloat(getComputedStyle(el).fontSize),width:rect.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
      });
      assert.ok(pricingTerms.size>=12,"Pricing scope stays at a readable font size");
      assert.ok(pricingTerms.scrollWidth<=pricingTerms.clientWidth+2,"Pricing scope does not overflow horizontally");
      await page.locator("#launchOffer").screenshot({path:"artifacts/packs-"+spec.name+".png",animations:"disabled"});
      assert.equal(state.clubStepCount,4,"Club project shows the four expected stages");
      assert.equal(await page.locator("#caseMyWay .club-workflow-step[aria-selected='true']").count(),1,"One stage is active at a time");
      assert.equal(await page.locator("#caseMyWay .club-workflow-screen").evaluate(el=>el.scrollWidth<=el.clientWidth+2),true,"Project mockup has no horizontal overflow");

      assert.ok(state.projects && state.caseStudy,"Projects and the Club workflow must be in DOM");
      assert.equal(state.css,"rgb(207, 230, 90)","Accent system styling must load");
      assert.equal(state.heroActionCount,0,"Requested hero CTA pair removed");
      assert.equal(state.systemAmbientCount,1,"One ambient system backdrop");
      assert.equal(state.systemAmbientMuted,true,"Ambient system backdrop always muted");
      assert.ok(state.systemScrim.includes("linear-gradient"),"Dark overlay preserves readable contrast");
      assert.equal(state.systemAmbientDisplay,"none","Reduced-motion browser should hide background video");
      assert.equal(state.systemAmbientPreload,"none","Reduced-motion browser should not fetch background video");
      assert.equal(state.heroMuted,true,"Hero is muted by default");
      assert.ok(state.mainWidth <= state.innerWidth+4,"Main must fit viewport");
      if (spec.isMobile) assert.ok(state.deliveryStepWidth >= 130,"Mobile process stages must remain readable");
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
      const featuredVideo=page.locator("video[data-editorial-reel]").first();
      const audioInstruction=await featuredVideo.getAttribute("aria-label");
      assert.ok(audioInstruction.includes("escuchar el audio original"),"Video remains directly operable without on-screen buttons");
      await page.locator('[data-filter="ugc"]').click();
      assert.equal(await page.locator('.project-item[data-category="ugc"]:not(.is-hidden)').count(),2,"UGC filter displays the two unique cards");
      await page.locator('[data-filter="product"]').click();
      assert.equal(await page.locator('.project-item[data-category="product"]:not(.is-hidden)').count(),2,"Campaign filter displays the two unique cards");
      assert.equal(await page.locator("#services .service-example-link").count(),3,"All services have contextual next steps");
      await page.locator("#services .service-card-ugc .service-example-link").click();
      assert.equal(await page.locator('[data-filter="ugc"]').getAttribute("aria-selected"),"true","UGC example shortcut selects the UGC projects");
      assert.equal(await page.locator('.project-item[data-category="ugc"]:not(.is-hidden)').count(),2,"UGC projects visible after shortcut");
      await page.locator("#services .service-card-product .service-example-link").click();
      assert.equal(await page.locator('[data-filter="product"]').getAttribute("aria-selected"),"true","Product example shortcut selects product campaign projects");
      assert.equal(await page.locator('.project-item[data-category="product"]:not(.is-hidden)').count(),2,"Product projects visible after shortcut");
      assert.equal(await page.locator("#services .service-card-testing .service-example-link").getAttribute("href"),"#caseMyWay","Variant service points to actual process example");
      await page.locator("#services .services-grid").screenshot({path:"artifacts/services-"+spec.name+".png",animations:"disabled"});
      // Page-error report is informational: third-party video/CDN failures are tested separately.
      console.log(JSON.stringify({viewport:spec.name,...state,pageErrors:pageErrors.slice(0,6)}));
      await context.close();
    }

    // Real network behavior: featured media stays deferred above the fold,
    // then is requested when its own card becomes visible (normal motion).
    const mediaContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:"no-preference"});
    const mediaRequests=[];
    await mediaContext.route("**/*.mp4",route=>{
      const target=new URL(route.request().url()).pathname;
      if(target.includes("silo-campana-producto-recortado.mp4")||target.includes("mariana-omelette-ugc.mp4"))mediaRequests.push(target);
      return route.abort();
    });
    await mediaContext.route("**/tracker.metricool.com/**",route=>route.abort());
    try {
      const mediaPage=await mediaContext.newPage();
      await mediaPage.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
      await mediaPage.waitForTimeout(600);
      assert.equal(mediaRequests.length,0,"Below-fold SILO and Mariana video bytes not requested on initial mobile load");
      const initialPauseState=await mediaPage.locator(".editorial-case video[data-editorial-reel]").evaluateAll(nodes=>nodes.map(el=>el.dataset.userPaused));
      assert.ok(initialPauseState.every(value=>value!=="true"),"Club initial render must not mark featured videos manually paused");

      await mediaPage.locator(".editorial-case--silo video").scrollIntoViewIfNeeded();
      await mediaPage.waitForTimeout(900);
      assert.ok(mediaRequests.some(p=>p.includes("silo-campana-producto-recortado.mp4")),"SILO requests media when visible");
      await mediaPage.locator(".editorial-case--mariana video").scrollIntoViewIfNeeded();
      await mediaPage.waitForTimeout(650);
      assert.ok(mediaRequests.some(p=>p.includes("mariana-omelette-ugc.mp4")),"Mariana requests media when visible");
      console.log(JSON.stringify({lazyFeaturedMedia:true,requestedOnVisibility:[...new Set(mediaRequests)]}));
    } finally {
      await mediaContext.close();
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
        if(staleSpec.width>=1300){
          assert.ok(Math.abs(freshHeader.brandCenter-staleSpec.width/2)<3,"Desktop logo centered with stale stylesheet");
          assert.ok(freshHeader.homeRight+8 < freshHeader.navLeft,"Home and links separated despite stale stylesheet");
           assert.ok(freshHeader.navRight+8 < freshHeader.brandLeft,"Links and centered logo separated despite stale stylesheet");
          assert.ok(freshHeader.brandRight+8 < freshHeader.ctaLeft,"CTA right aligned despite stale stylesheet");
        } else {
          assert.ok(Math.abs(freshHeader.brandCenter-staleSpec.width/2)<3,"Mobile brand centered with stale stylesheet");
          assert.ok(freshHeader.homeRight+8 <= freshHeader.brandLeft,"Mobile home does not overlap brand with cached CSS (>= 8px)");
          assert.ok(freshHeader.brandRight+8 <= freshHeader.toggleLeft,"Mobile brand does not overlap menu with cached CSS (>= 8px)");
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
