// Static invariants for the Pato Creando portfolio. No network or dependencies.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("assets/site.css", "utf8");
const js = fs.readFileSync("assets/site.js", "utf8");
const premiumCss = fs.readFileSync("assets/premium-lab.css", "utf8");
const premiumJs = fs.readFileSync("assets/premium-lab.js", "utf8");
const has = (text, needle, context) => assert.ok(text.includes(needle), context || needle);
const occurrences = (text, needle) => text.split(needle).length - 1;
const links = text => new Set([...text.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(match => match[1]));
const sectionIds = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]);

assert.deepEqual(sectionIds, ["top","projects","caseMyWay","services","launchOffer","system","method","contact"], "section order");
assert.ok(css.length > 260000, "extracted CSS must not lose original rules");
assert.ok(js.length > 64000, "Core JS controllers must remain intact after removing the carousel");
assert.ok(!js.includes("workflowCodeCanvas"),"unused typewriter removed");
has(css, ".case-study-wrap");
has(css, ".hero-cta-primary");
has(html, 'href="#main-content"');

const headerMarkup=html.slice(html.indexOf('<header id="portfolioHeader"'),html.indexOf('  <main id="main-content">'));
assert.ok(headerMarkup.startsWith('<header id="portfolioHeader"'),"one unified portfolio header");
assert.equal(occurrences(html,'id="portfolioHeader"'),1,"single main navigation");
assert.equal(occurrences(headerMarkup,'https://patocreando.github.io/inicio/'),1,"Inicio link integrated only once");
assert.equal(occurrences(html,'class="home-return"'),0,"remove independently fixed Inicio pill");
assert.ok(!html.includes('id="home-return-style"'),"retire legacy overlay style");
assert.equal(occurrences(headerMarkup,'href="#top"'),1,"brand anchor preserved");
assert.equal(occurrences(headerMarkup,'href="#projects"'),2,"desktop and mobile project link");
assert.equal(occurrences(headerMarkup,'href="#system"'),2,"desktop and mobile system link");
assert.equal(occurrences(headerMarkup,'href="#services"'),2,"desktop and mobile service link");
assert.equal(occurrences(headerMarkup,'href="#launchOffer"'),2,"desktop and mobile packs link");
assert.equal(occurrences(headerMarkup,'href="#contact"'),2,"desktop and mobile Hablemos");
assert.equal(occurrences(headerMarkup,'id="menuToggle"'),1,"one menu controller");
assert.equal(occurrences(headerMarkup,'id="mobileMenu"'),1,"one mobile menu");
assert.ok(headerMarkup.includes('aria-controls="mobileMenu"'),"accessible menu control wiring");
has(premiumCss,"#portfolioHeader .portfolio-nav-layout");
has(premiumCss,"grid-template-columns:minmax(250px,1fr) auto minmax(130px,1fr)");
has(premiumCss,"#portfolioHeader .portfolio-mobile-menu.is-open");

assert.equal(occurrences(html,'class="hero-reveal hero-actions"'),0,"remove duplicated hero CTAs only");
assert.equal(occurrences(html,'href="#projects"'),2,"main navigation to projects remains in desktop and mobile");
assert.equal(occurrences(html,'href="#launchOffer"'),2,"main navigation to packs remains in desktop and mobile");
assert.equal(occurrences(html,'class="studio-system-ambient"'),1,"one decorative production background");
assert.equal(occurrences(html,'class="studio-system-board section-reveal"'),1,"production card remains unique");
assert.equal(occurrences(html,'class="studio-system-sequence"'),1,"retain four system steps");
assert.equal(occurrences(html,"https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/8ece9361-a363-477c-8a2e-e6d221cdc562.mp4"),2,"reuse method background video in production card");
has(premiumCss,'.studio-system-board::before');
has(premiumJs,'systemBackgroundPlayback');
has(premiumJs,'prefers-reduced-motion: reduce');
has(premiumJs,'connection.saveData');

has(html, 'role="tabpanel"');
has(html, 'aria-labelledby="caseMyWayTitle"');
assert.equal(occurrences(html, "aria-controls=\"projectGrid\""), 2);
for (const file of ["assets/site.css","assets/site.js","assets/premium-lab.css","assets/premium-lab.js","assets/favicon.svg","assets/google-meet-logo.png"]) {
  assert.ok(fs.existsSync(file), "Missing local asset "+file);
  has(html, "./"+file);
}
for (const [ref,price] of [["w60952078","ARS 50.000"],["w60952216","ARS 100.000"],["w60952262","ARS 150.000"]]) {
  assert.equal(occurrences(html, ref), 1, "Manychat ref: "+ref);
  assert.equal(occurrences(html, price), 1, "pack price: "+price);
}
has(html, 'media="(max-width: 639px)"');
has(html, 'class="case-study-video"');
has(html, 'Proyecto conceptual, no campaña publicada por la marca.');
assert.ok(!js.includes("pricingPackMobileLoop"), "pricing carousel should be manual");
assert.ok(!js.includes("mobileHorizontalCarouselLoops"), "mobile cards should not autoplay");
assert.ok(!js.includes("document.addEventListener(eventName, handleGesture"), "hero sound must be explicit");
has(js, 'soundToggle.addEventListener("click", toggleAudio)');
has(js, 'button.addEventListener("keydown"');
assert.equal(occurrences(html, 'src="./assets/site.js"'), 1);
assert.equal(occurrences(html, 'href="./assets/site.css"'), 1);
// Compare against main as ground truth for preservation.
try {
  const baseline = execFileSync("git", ["show", "origin/main:index.html"], {encoding:"utf8"});
  const intentionallyRemovedUrls = new Set(["https://www.instagram.com/p/Dd24xgrOr5e/?hl=en"]);
  const missing = [...links(baseline)].filter(url => !intentionallyRemovedUrls.has(url) && !links(html).has(url));
  assert.deepEqual(missing, [], "Original external media/link URLs were dropped");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.warn("Git unavailable: external URL baseline check omitted.");
}
assert.equal(occurrences(html,'data-editorial-reel'),2,"two additional curated reel previews");
const archivedProjects = [...html.matchAll(/<article\b[^>]*class="[^"]*\bproject-item\b[^"]*"[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
assert.equal(archivedProjects.length,4,"archive contains four unique project cards");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="ugc"')).length,2,"two unique UGC cards");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="product"')).length,2,"two unique campaign cards");
for (const name of ["cc882a72-3df6-41a3-8398-619e1e7ba9a9.mp4","d5ea268d-4d9f-4c93-9139-439d4b8ace03.mp4"]) {
  assert.equal(occurrences(html,name),1,"featured video appears only in one editorial banner: "+name);
  assert.ok(!archivedProjects.some(card=>card.includes(name)),"archive must not repeat featured video: "+name);
}
assert.equal(occurrences(html,"Perfume real llevado a una estética cinematográfica."),0,"remove duplicate Perfumería IA copy");
assert.equal(occurrences(html,"Lenguaje de campaña en clave UGC."),0,"remove duplicate UGC perfume copy");
assert.equal(occurrences(html,'class="editorial-case"'),2,"two new editorial case chapters");
has(html,'NOIR 17');
has(html,'UGC Beauty');
has(html,'03 / Caso aplicado · My Way');
assert.equal(occurrences(html,'Workflow aplicado · My Way'),0,"redundant My Way project card should be removed");
assert.equal(occurrences(html,'https://www.instagram.com/p/Dd24xgrOr5e/?hl=en'),0,"remove requested My Way original reference button");
assert.equal(occurrences(html,'class="case-study-reference"'),0,"remove requested My Way reference CTA");
assert.equal(occurrences(html,'Explorar otros formatos'),0,"remove requested duplicate editorial link");
assert.equal(occurrences(html,'Ver la galería completa'),0,"requested UGC gallery CTA removed");
assert.equal(occurrences(html,'class="editorial-project-link"'),0,"no extra editorial CTA buttons");
assert.equal(occurrences(html,'href="#projectFilters"'),0,"gallery anchor no longer linked from case");
assert.equal(occurrences(html,'id="projectFilters"'),1,"retain the gallery filter section");
assert.equal(occurrences(html,'3fb33f83-1289-4aa6-a48e-d9adeb242cd7.mp4'),1,"My Way video displayed only once");
assert.equal(occurrences(html,'Muestra autorizada para Shop Online Perfumería.'),1,"disclaimer displayed only once");
assert.equal(occurrences(html, 'data-category="workflow"'),0,"no workflow gallery tab or card");
assert.equal(occurrences(html, 'data-filter="workflow"'),0,"only UGC and product remain");
assert.equal(occurrences(html, 'id="system"'),1,"system presentation is standalone");
assert.equal(occurrences(html, 'class="studio-system-conversion section-reveal"'),1,"one contextual conversion call to action");
has(html,'href="#contact">Contame el proyecto');
has(premiumCss,'.studio-system-map');
has(premiumCss,'.studio-system-toolgrid');
assert.equal(occurrences(html,'href="#system"'),2,"desktop and mobile navigation to system");
assert.equal(occurrences(html,'social-proof'),0,"no social proof placeholders");

has(html,'id="projectFilters"');
has(html,'aria-labelledby="noirCaseTitle"');
has(html,'aria-labelledby="ugcCaseTitle"');
has(premiumCss,'.editorial-showcase');
has(premiumCss,'.hero-edition-label');
has(premiumJs,'IntersectionObserver');
assert.ok(!premiumJs.includes('video.muted=false'),"editorial videos may never turn on sound");
assert.equal(occurrences(html,'href="./assets/premium-lab.css"'),1);
assert.equal(occurrences(html,'src="./assets/premium-lab.js"'),1);
has(html,'class="method-brief-grid"');
assert.equal(occurrences(html,'class="method-brief-grid"'),1,"single short collaboration timeline");
assert.equal(occurrences(html,'class="method-brief-grid"'),1,"three-step timeline component");
assert.equal(occurrences(html,'method-brief-grid'),1,"only one method component");
assert.equal(occurrences(html,'<article><span>0'),3,"exactly three collaboration steps");
assert.equal(occurrences(html,'id="bottleneck"'),0,"remove duplicate bottleneck");
assert.equal(occurrences(html,'id="fit"'),0,"remove duplicate fit");
assert.equal(occurrences(html,'id="creativePaths"'),0,"remove duplicate creative paths");
assert.equal(occurrences(html,'class="direction-principle"'),0,"no duplicate creative direction banner");
has(js,'document.querySelector("#method .method-brief-ambient")');
assert.ok(!js.includes('methodSlider'),"methodology carousel controller retired");
assert.ok(premiumCss.includes('LAB04 — Compact collaboration'),"new method CSS loaded");
has(premiumCss,'Production System: visible cinematography');
has(premiumCss,'#system .studio-system-board::after');
has(premiumCss,'@keyframes studio-system-atmosphere');
has(premiumCss,'opacity:.78');


const toolCards=[...html.matchAll(/class="tool-pipeline-card tool-pipeline-[^"]+"/g)];
assert.equal(toolCards.length,3,"one card for each stage of production");
assert.equal(occurrences(html,'class="tool-app"'),8,"eight visible tool icon tiles");
assert.equal(occurrences(html,'class="studio-system-toolgrid"'),1,"tool stack remains unique");
assert.equal(occurrences(html,'role="listitem"'),3,"three accessible tool cards");
for(const name of ["ChatGPT","Nano Banana Pro","Higgsfield Soul","Omni 1.1 Flash","Google Flow Labs","Python","CapCut","Canva"])has(html,'>'+name+'</span>');
const toolBlock=html.slice(html.indexOf('class="studio-system-tools section-reveal"'),html.indexOf('class="studio-system-conversion section-reveal"'));
for(const removed of ["Seedance","FFmpeg"])assert.ok(!toolBlock.includes(removed),"removed tool is absent from stack: "+removed);
assert.ok(!toolBlock.includes('title="Higgsfield"'),"generic Higgsfield tile moved to Soul in Direction");
assert.equal(occurrences(toolBlock,'>Higgsfield Soul</span>'),1,"Soul belongs in Direction only");
assert.equal(occurrences(toolBlock,'class="tool-apps tool-apps--two"'),1,"generation has two centered tool slots");
assert.ok(toolBlock.indexOf('title="Higgsfield Soul"')<toolBlock.indexOf('02 / Generación'),"Soul is placed in Direction");
assert.ok(toolBlock.indexOf('title="Google Flow Labs"')>toolBlock.indexOf('02 / Generación'),"Google Flow Labs stays in Generation");
assert.equal(occurrences(toolBlock,'class="tool-apps--four"'),0,"finishing no longer uses four columns");
const toolsBase="assets/tool-icons/";
const toolFiles=[...html.matchAll(/src="\.\/assets\/tool-icons\/([a-z-]+\.svg)"/g)].map(x=>x[1]);
assert.equal(toolFiles.length,8,"eight icon placements with local assets");
assert.equal(new Set(toolFiles).size,8,"eight bundled icons, including Veo");
for(const icon of new Set(toolFiles)){
  assert.ok(fs.existsSync(toolsBase+icon),"tool icon exists: "+icon);
  const source=fs.readFileSync(toolsBase+icon,"utf8");
  assert.ok(source.startsWith("<svg")&&source.includes("</svg>"),"valid SVG: "+icon);
  assert.ok(!/<script|<foreignObject|onload\s*=|javascript:/i.test(source),"no active SVG content: "+icon);
}
has(premiumCss,'@keyframes tool-pipeline-border-wave');
has(premiumCss,'#system .tool-pipeline-generation .tool-apps--two');
for(const icon of ['gemini.svg','veo.svg','python.svg','canva-initial.svg']){
 const src=fs.readFileSync(toolsBase+icon,'utf8');
 assert.ok(src.includes('<path'), 'source-accurate vector exists for '+icon);
}
assert.ok(fs.readFileSync(toolsBase+"veo.svg","utf8").includes("Google"), "Flow uses Google-brand geometry, not a made-up identifier");
has(html,'./assets/tool-icons/veo.svg');
assert.ok(!toolBlock.includes('title="Veo"'),"Old Veo label removed from the tile");
assert.equal(occurrences(toolBlock,'>Google Flow Labs</span>'),1,"New label visible exactly once");
has(premiumCss,'@keyframes tool-pipeline-sweep');
has(premiumCss,'@media(prefers-reduced-motion:reduce)');

console.log("Premium LAB smoke OK: chapters, assets, links, pricing and playback invariants.");
