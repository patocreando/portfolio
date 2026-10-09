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
  const missing = [...links(baseline)].filter(url => !links(html).has(url));
  assert.deepEqual(missing, [], "Original external media/link URLs were dropped");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.warn("Git unavailable: external URL baseline check omitted.");
}
assert.equal(occurrences(html,'data-editorial-reel'),2,"two additional curated reel previews");
const archivedProjects = [...html.matchAll(/<article\\b[^>]*class="[^"]*\\bproject-item\\b[^"]*"[^>]*>[\\s\\S]*?<\\/article>/g)].map(match=>match[0]);
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
assert.equal(occurrences(html,'https://www.instagram.com/p/Dd24xgrOr5e/?hl=en'),1,"preserve exactly one link to My Way original reference");
assert.equal(occurrences(html,'class="case-study-reference"'),1,"reference link belongs in canonical My Way case");
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
console.log("Premium LAB smoke OK: chapters, assets, links, pricing and playback invariants.");
