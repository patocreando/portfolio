// Static invariants for the Pato Creando portfolio. No network or dependencies.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("assets/site.css", "utf8");
const js = fs.readFileSync("assets/site.js", "utf8");
const premiumCss = fs.readFileSync("assets/premium-lab.css", "utf8");
const premiumJs = fs.readFileSync("assets/premium-lab.js", "utf8");
const pagesScript = fs.readFileSync("scripts/stage-pages.mjs", "utf8");
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
has(pagesScript, "poster|data-src", "Pages staging includes dynamically selected local media");

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
assert.equal(occurrences(headerMarkup,'href="#launchOffer"'),2,"desktop and mobile packs link in header");
assert.equal(occurrences(html,'href="#launchOffer"'),3,"header navigation (desktop + mobile) plus hero discrete CTA to packs");
has(html,'class="hero-cta-packs inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-300 hover:text-butter transition-colors"',"hero discrete CTA element is present with exact styling classes");
has(html,'<span>Ver planes de trabajo</span>',"hero discrete CTA label is present");
const methodScopeMatch=html.match(/<p class="method-brief-scope section-reveal">([\s\S]*?)<\/p>/);
assert.ok(methodScopeMatch,"method terms remain in a single disclosure");
assert.ok(methodScopeMatch[1].includes("<strong>Alcance, revisiones y plazos de entrega:</strong>"),"scope, review and timelines explicitly disclosed");
assert.ok(methodScopeMatch[1].includes("<strong>Pago:</strong> se realiza al momento de la entrega final."),"payment is due with final delivery");
assert.equal(occurrences(html,"Los alcances y las revisiones se definen por proyecto o por pack."),0,"previous ambiguous copy replaced");
assert.equal(occurrences(html,'class="studio-system-ambient"'),1,"one decorative production background");
assert.equal(occurrences(html,'class="studio-system-board section-reveal"'),1,"production card remains unique");
assert.equal(occurrences(html,'class="studio-system-sequence"'),1,"retain four system steps");
assert.equal(occurrences(html,"https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/8ece9361-a363-477c-8a2e-e6d221cdc562.mp4"),2,"reuse method background video in production card");
has(premiumCss,'.studio-system-board::before');
has(premiumJs,'systemBackgroundPlayback');
has(premiumJs,'prefers-reduced-motion: reduce');
has(premiumJs,'connection.saveData');

has(html, 'role="tabpanel"');
has(html, 'aria-labelledby="clubWorkflowTitle"');
assert.equal(occurrences(html, "aria-controls=\"projectGrid\""), 2);
for (const file of ["assets/site.css","assets/site.js","assets/premium-lab.css","assets/premium-lab.js","assets/favicon.svg"]) {
  assert.ok(fs.existsSync(file), "Missing local asset "+file);
  has(html, "./"+file);
}
for (const file of ["assets/club-case.css","assets/club-case.js","assets/cases/club-del-coctel-01/character-sheet.webp","assets/cases/club-del-coctel-01/kitchen-anchor.webp","assets/cases/club-del-coctel-01/generated-scene.mp4","assets/cases/club-del-coctel-01/edit-shot-01.webp","assets/cases/club-del-coctel-01/edit-shot-02.webp","assets/cases/club-del-coctel-01/edit-shot-03.webp","assets/videos/ugc-beauty.mp4","assets/videos/ugc-fashion.mp4","assets/videos/hyperreal-portrait.mp4"]) {
  assert.ok(fs.existsSync(file), "Missing Club case asset "+file);
}
assert.ok(fs.existsSync("assets/google-meet-logo.png"), "Asset google-meet-logo.png retained in repository for backward compatibility");
assert.equal(occurrences(html,'id="deliverables"'),1,"delivery stages are anchored inside the Club case");
assert.equal(occurrences(html,'data-club-step'),4,"four interactive production stages");
assert.equal(occurrences(html,'class="club-proposal-board"'),1,"proposal board is a visual mockup");
assert.equal(occurrences(html,'class="club-edit-board"'),1,"editing timeline is a visual mockup");
assert.equal(occurrences(html,'class="cloud-node'),0,"separate deliverables cloud removed");
for(const label of ["Panel previo a generar","Generación controlada","Ritmo, audio y calidad","Clip sin copy ni subtítulos añadidos"])has(html,label);
has(fs.readFileSync("assets/club-case.css","utf8"),"@media(prefers-reduced-motion:reduce)","reduced-motion interactive case");

for (const [ref,price,count] of [["w60952078","ARS 50.000",2],["w60952216","ARS 100.000",1],["w60952262","ARS 200.000",1]]) {
  assert.equal(occurrences(html, ref), 1, "Manychat ref: "+ref);
  assert.equal(occurrences(html, price), count, "pack price and base disclosures: "+price);
}
assert.equal(occurrences(html,'ARS 150.000'),0,"obsolete campaign price removed");
for(const phrase of ['1 reel vertical 9:16','2 reels verticales 9:16','4 reels verticales 9:16','panel visual personalizado','Antes de generar','Digitalización y cierre en campaña'])has(html,phrase);
assert.equal(occurrences(html,'data-sample-video'),0,"no duplicated samples");
has(html,'<title>Pato Creando | Reels UGC y anuncios de producto con IA</title>');
has(html,'<meta property="og:title" content="Pato Creando | Reels UGC y anuncios de producto con IA" />');
has(html,'<meta name="twitter:title" content="Pato Creando | Reels UGC y anuncios de producto con IA" />');
has(html,'class="pricing-secondary-contact section-reveal"');
has(html,'href="#contact" aria-label="Ir al formulario de contacto para enviar tu consulta"');
has(html,'class="contact-brief-hint"');
has(html,'<label for="projectType">Tipo y cantidad de piezas</label>');
has(html,'<span id="submitLabel">Enviar consulta</span>');
has(html,'<strong id="formStatusTitle">Consulta enviada</strong>');
has(js,'submitLabel.textContent = "Enviar consulta"');
assert.equal(occurrences(js,'"Enviar propuesta"'),0,"obsolete submission wording removed");
assert.equal(occurrences(html,'aria-labelledby="siloCaseTitle"'),1,"SILO featured campaign replaces the perfume concept");
assert.equal(occurrences(html,'Perfumería de nicho'),0,"removed conceptual perfume card stays removed");
assert.equal(occurrences(html,'SPEC AD · FICTICIO'),0,"Unlicensed spec ads never shipped");
assert.equal(occurrences(html,'project-item-piero'),0,"Piero media excluded from public build");
assert.equal(occurrences(html,'editorial-case-ls2'),0,"LS2 media excluded from public build");
has(html,'./assets/lote-02.css?v=20261027-club-case-3');
assert.ok(fs.existsSync('assets/lote-02.css'),"Lote 02 CSS exists");

assert.ok(!html.includes('10 cupos'),"no artificial scarcity");
has(html, 'media="(max-width: 639px)"');
has(html, 'id="caseMyWay"');
assert.equal(occurrences(html,'class="editorial-index"'),0,'remove category tags from featured videos');
assert.equal(occurrences(html,'class="editorial-footnote"'),0,'remove video footnote tags');
assert.equal(occurrences(html,'class="service-chips"'),0,'remove service badges layered with video cards');
assert.equal(occurrences(html,'class="pricing-pack-badge"'),0,'remove floating tag above the plan video');
assert.equal(occurrences(html,'class="service-kicker"'),0,'remove category labels from service video cards');
assert.equal(occurrences(html,'data-umbral-reel'),0,'legacy UMBRAL showcase removed');
assert.equal(occurrences(html,'class="club-workflow-video"'),1,'one video player is reused across the interactive stages');
assert.equal(occurrences(html,'data-club-step'),4,'four interactive Club stages');
assert.equal(occurrences(html,'Una lámpara que no existe.'),0,'replaced the UMBRAL project copy');
assert.equal(occurrences(html,'UMBRAL / 01'),0,'no UMBRAL project heading remains');
has(html,'De la idea <span>al archivo final.</span>');
has(html,'QUÉ RECIBÍS / PRODUCCIÓN CON IA · CLUB DEL CÓCTEL');
has(html,'./assets/cases/club-del-coctel-01/character-sheet.webp');
has(html,'./assets/cases/club-del-coctel-01/generated-scene.mp4');
has(html,'./assets/videos/club-del-coctel.mp4');
has(html,'./assets/club-case.css?v=20261027-3');
has(html,'./assets/club-case.js?v=20261027-3');
has(html,'data-club-audio');
has(fs.readFileSync('assets/club-case.js','utf8'),'intervalMs = 6500');
assert.equal(occurrences(html,'edit-shot-02.webp'),0,'the editing mockup omits the B-roll insert');
for(const file of ['ugc-beauty.mp4','ugc-fashion.mp4','hyperreal-portrait.mp4'])has(html,'./assets/videos/'+file);
for(const phrase of ['Uso realista, sin perder naturalidad.','Detalle que resiste el primer plano.','Avatar de moda aplicado a una campaña.'])assert.equal(occurrences(html,phrase),0,'gallery video copy removed: '+phrase);
assert.equal(occurrences(html,'./assets/umbral-compact.css'),0,'obsolete UMBRAL presentation stylesheet is no longer loaded');
assert.equal(occurrences(js,'function umbralAutoSequence()'),0,'obsolete UMBRAL playback code removed');
assert.equal(occurrences(html,'03 / PRODUCTO IA · PERFUMERÍA'),0,'old case replaced');
assert.ok(!js.includes("pricingPackMobileLoop"), "pricing carousel should be manual");
assert.ok(!js.includes("mobileHorizontalCarouselLoops"), "mobile cards should not autoplay");
assert.ok(!js.includes("document.addEventListener(eventName, handleGesture"), "hero sound must be explicit");
has(js, 'soundToggle.addEventListener("click", toggleAudio)');
has(js, 'button.addEventListener("keydown"');
assert.equal(occurrences(html, 'src="./assets/site.js?v=20261027-club-case-3"'),1);
assert.equal(occurrences(html, 'href="./assets/site.css"'), 1);
// Compare against main as ground truth for preservation.
try {
  const baseline = execFileSync("git", ["show", "origin/main:index.html"], {encoding:"utf8"});
  const intentionallyRemovedUrls = new Set(["https://www.instagram.com/p/Dd24xgrOr5e/?hl=en","https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/cc882a72-3df6-41a3-8398-619e1e7ba9a9.mp4"]);
  const missing = [...links(baseline)].filter(url => !intentionallyRemovedUrls.has(url) && !links(html).has(url));
  assert.deepEqual(missing, [], "Original external media/link URLs were dropped");
} catch (error) {
  if (!["ENOENT","EPERM"].includes(error?.code)) throw error;
  console.warn("Git unavailable: external URL baseline check omitted.");
}
assert.equal(occurrences(html,'data-editorial-reel'),2,"two additional curated reel previews");
const archivedProjects = [...html.matchAll(/<article\b[^>]*class="[^"]*\bproject-item\b[^"]*"[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
assert.equal(archivedProjects.length,4,"archive contains four unique project cards");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="ugc"')).length,2,"two unique UGC cards");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="product"')).length,2,"two unique campaign cards");
assert.equal(occurrences(html,"silo-campana-producto-recortado.mp4"),1,"SILO reel appears once");
assert.equal(occurrences(html,"club-del-coctel.mp4"),2,"Club reel is reused in its project and final delivery stage");
for (const name of ["silo-campana-producto-recortado.mp4","club-del-coctel.mp4"])
  assert.ok(!archivedProjects.some(card=>card.includes(name)),"archive must not repeat featured video: "+name);
assert.ok(fs.existsSync("assets/videos/club-del-coctel.mp4"), "Club del Cóctel reel asset exists");
assert.ok(fs.statSync("assets/videos/club-del-coctel.mp4").size > 1_000_000, "Club del Cóctel video is not an empty placeholder");
assert.ok(fs.existsSync("assets/images/club-del-coctel.jpg"), "Club del Cóctel poster exists");
assert.equal(occurrences(html,"Perfume real llevado a una estética cinematográfica."),0,"remove duplicate Perfumería IA copy");
assert.equal(occurrences(html,"Lenguaje de campaña en clave UGC."),0,"remove duplicate UGC perfume copy");
assert.equal((html.match(/class="editorial-case(?: editorial-case--silo)?"/g)||[]).length,2,"two editorial showcases");
has(html,'Digitalización y cierre en campaña');
has(html,'Una receta, contada desde la barra.');
assert.equal(occurrences(html,'03 / PRODUCTO IA · DIRECCIÓN CREATIVA'),0,'old UMBRAL project heading removed');
assert.equal(occurrences(html,'Una campaña que sí.'),0,'old UMBRAL project copy removed');
assert.equal(occurrences(html,'Workflow aplicado · My Way'),0,"redundant My Way project card should be removed");
assert.equal(occurrences(html,'https://www.instagram.com/p/Dd24xgrOr5e/?hl=en'),0,"remove requested My Way original reference button");
assert.equal(occurrences(html,'class="case-study-reference"'),0,"remove requested My Way reference CTA");
assert.equal(occurrences(html,'Explorar otros formatos'),0,"remove requested duplicate editorial link");
assert.equal(occurrences(html,'Ver la galería completa'),0,"requested UGC gallery CTA removed");
assert.equal(occurrences(html,'class="editorial-project-link"'),0,"no extra editorial CTA buttons");
assert.equal(occurrences(html,'href="#projectFilters"'),2,"two service examples lead to gallery filters");
assert.equal(occurrences(html,'id="projectFilters"'),1,"retain the gallery filter section");
assert.equal(occurrences(html,'class="service-cta service-example-link"'),3,"each service has one useful next step");
has(html,'data-service-filter="ugc" href="#projectFilters"');
has(html,'data-service-filter="product" href="#projectFilters"');
has(html,'class="service-cta service-example-link" href="#caseMyWay"');
has(html,'Versiones de aperturas, planos y relatos');
has(js,'document.querySelectorAll(".service-example-link[data-service-filter]")');

assert.equal(occurrences(html,'final-trim2.web.mp4'),0,'old UMBRAL video master removed');
assert.equal(occurrences(html,'monument-trim2.web.mp4'),0,'old UMBRAL hero removed');
assert.equal(occurrences(html,'UMBRAL es una lámpara ficticia.'),0,'old conceptual disclaimer removed');
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
has(html,'aria-labelledby="siloCaseTitle"');
has(html,'aria-labelledby="clubCaseTitle"');
has(html,'aria-labelledby="clubWorkflowTitle"');
has(premiumCss,'.editorial-showcase');
assert.equal(occurrences(premiumCss,'.editorial-media-note'),0,'no floating caption style over featured videos');
has(premiumJs,'IntersectionObserver');
has(premiumJs,'video.dataset.userUnmuted');
has(premiumJs,'window.__PATO_ACTIVATE_VIDEO_AUDIO__=activate');
assert.equal(occurrences(html,'editorial-campaign-tag'),0,'video copy is not injected as an HTML badge');
assert.equal(occurrences(html,'editorial-play-control'),0,'video pause/play buttons are removed');
assert.equal(occurrences(html,'data-audio-available="true"'),4,'all local portfolio videos with original audio expose it');
assert.equal(occurrences(html,'data-umbral-audio'),0,'no obsolete UMBRAL audio UI remains');
assert.equal(occurrences(html,'href="./assets/premium-lab.css?v=20261027-club-case-3"'),1);
assert.equal(occurrences(html,'href="./assets/lote-02.css?v=20261027-club-case-3"'),1);
assert.equal(occurrences(html,'id="clubWorkflowTitle"'),1,'interactive project title has a unique id');
assert.equal(occurrences(html,'id="portfolio-nav-critical"'),1,"critical navbar rules embedded in delivered HTML");
const criticalNavStyle=html.slice(html.indexOf('<style id="portfolio-nav-critical">'),html.indexOf('</style>',html.indexOf('<style id="portfolio-nav-critical">')));
for(const rule of ['#portfolioHeader .portfolio-nav-layout','#portfolioHeader .portfolio-nav-links','#portfolioHeader .portfolio-mobile-menu.is-open','@media(max-width:1299px)'])has(criticalNavStyle,rule);
assert.ok(html.indexOf('id="portfolio-nav-critical"') < html.indexOf('</head>'),"critical navbar styles load before any page content");
assert.ok(criticalNavStyle.includes('position:fixed;inset:0 0 auto;z-index:1000;'),"navbar position does not depend on Tailwind runtime");

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


assert.equal(occurrences(html,'WORKFLOW'),0,"no WORKFLOW badges remain on any video");
assert.equal(occurrences(html,'./assets/videos/silo-campana-producto-recortado.mp4'),1,"first SILO ad appears in featured case");
assert.equal(occurrences(html,'./assets/videos/silo-ugc-sin-subtitulos.mp4'),1,"second SILO ad appears in campaign gallery");
assert.equal(occurrences(html,'./assets/images/pato-creando-ia-content-v4.png'),1,"redesigned logo appears only in navigation");
assert.equal(occurrences(html,'hero-brandmark'),0,"hero logo removed");
assert.ok(fs.existsSync('assets/images/pato-creando-ia-content-v4.png'),"redesigned logo asset exists");
assert.ok(fs.existsSync('assets/silo-update.css'),"SILO responsive styles exist");
has(html,'./assets/silo-update.css');
assert.equal(occurrences(html,'Un perfume. Otra atmósfera.'),0,"old featured concept removed");
assert.equal(occurrences(html,'Del frasco a una pieza conceptual.'),0,"old campaign card removed");
console.log("Premium LAB smoke OK: chapters, assets, links, pricing and playback invariants.");
