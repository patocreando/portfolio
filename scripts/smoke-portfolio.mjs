// Static invariants for the Pato Creando portfolio. No network or dependencies.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("assets/site.css", "utf8");
const js = fs.readFileSync("assets/site.js", "utf8");
const premiumCss = fs.readFileSync("assets/premium-lab.css", "utf8");
const premiumJs = fs.readFileSync("assets/premium-lab.js", "utf8");
const mobileHeroFallback = fs.readFileSync("assets/mobile-hero-fallback.js", "utf8");
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
assert.equal(occurrences(html,'href="#projects"'),3,"desktop, mobile and Hero links lead to selected work");
assert.equal(occurrences(headerMarkup,'href="#launchOffer"'),2,"desktop and mobile packs link in header");
assert.equal(occurrences(html,'href="#launchOffer"'),2,"only desktop and mobile navigation links point to plans");
has(html,'class="pc-hero-cta pc-hero-cta--primary"',"primary portfolio CTA exists");
has(html,'href="#projects" class="pc-hero-cta pc-hero-cta--primary"',"primary CTA leads to selected work");
has(html,'href="#contact" class="pc-hero-cta pc-hero-cta--secondary"',"secondary CTA leads to contact");
has(html,'Propuesta visual aprobada antes de generar',"hero microcopy states the preproduction checkpoint");
assert.equal(occurrences(html,'class="studio-system-ambient"'),1,"one methodology ambient video remains");
assert.equal(occurrences(html,'class="pc-method-six-number"'),6,"six visible methodology stages");
for(const step of ["Brief y análisis","Dirección visual","Anclas y continuidad","Generación controlada","Selección y edición","Control y entrega"])has(html,step);
has(html,"Las etapas se adaptan al alcance de cada proyecto.");
assert.equal(occurrences(html,"https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/8ece9361-a363-477c-8a2e-e6d221cdc562.mp4"),1,"original methodology ambient video retained");
has(html,'aria-label="Responsabilidades de la colaboración"');
assert.equal(occurrences(html,'class="pc-collab-column"'),3,"three collaboration responsibility columns");
has(html,'Para marcas que necesitan mostrar mejor sus productos.');
has(html,'Un apoyo de producción para briefs creativos.');
has(html,'no incluye gestión de Meta Ads ni media buying.');
has(premiumCss,'.studio-system-board::before');
has(premiumJs,'systemBackgroundPlayback');
has(premiumJs,'prefers-reduced-motion: reduce');
has(premiumJs,'connection.saveData');

has(html, 'role="tabpanel"');
has(html, 'aria-labelledby="clubWorkflowTitle"');
assert.equal(occurrences(html, "aria-controls=\"projectGrid\""), 3);
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
// The current Club case exposes four actionable stage tabs, not the retired copy.
for(const label of ["Propuesta visual","Producción","Edición","Archivo final"]) {
  assert.equal(occurrences(html,'<strong>'+label+'</strong>'),1,"Club stage label occurs once: "+label);
}
for(const kind of ['data-kind="proposal"','data-kind="edit"'])has(html,kind,"Club stage kind: "+kind);
has(fs.readFileSync("assets/club-case.css","utf8"),"@media(prefers-reduced-motion:reduce)","reduced-motion interactive case");

for (const [ref,price,count] of [["w60952078","ARS 50.000",2],["w60952216","ARS 100.000",1],["w60952262","ARS 175.000",1]]) {
  assert.equal(occurrences(html, ref), 1, "Manychat ref: "+ref);
  assert.equal(occurrences(html, price), count, "pack price and base disclosures: "+price);
}
assert.equal(occurrences(html,'ARS 150.000'),0,"obsolete campaign price removed");
// Commercial content: fixed plans and existing commercial conditions.
has(html,'<strong>Tres alcances según la cantidad de piezas.</strong>');
for(const phrase of ['ARS 50.000','ARS 100.000','ARS 175.000','1 reel vertical 9:16','2 reels verticales 9:16','4 reels verticales 9:16','Digitalización o generación con IA','Dirección visual y edición','Subtítulos dinámicos de alta retención incluidos','Imágenes, carruseles o variantes adicionales pueden cotizarse por separado.'])has(html,phrase);
assert.equal(occurrences(html,'data-sample-video'),0,"no duplicated samples");
has(html,'<title>Pato Creando | Dirección creativa y producción audiovisual con IA</title>');
has(html,'<meta property="og:title" content="Pato Creando | Dirección creativa y producción audiovisual con IA" />');
has(html,'<meta name="twitter:title" content="Pato Creando | Dirección creativa y producción audiovisual con IA" />');

// Block 1: sharing preview must use an existing lightweight, branded asset.
const shareImage = "assets/images/pato-creando-ia-content-v4.png";
const shareImageUrl = "https://patocreando.github.io/portfolio/" + shareImage;
for (const tag of [
  '<meta property="og:image" content="' + shareImageUrl + '" />',
  '<meta property="og:image:type" content="image/png" />',
  '<meta property="og:image:width" content="1550" />',
  '<meta property="og:image:height" content="600" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:image" content="' + shareImageUrl + '" />'
]) has(html,tag,"Social preview metadata: " + tag);
has(html,'<meta property="og:image:alt" content="Pato Creando: producción audiovisual y contenido comercial con IA" />');
has(html,'<meta name="twitter:image:alt" content="Pato Creando: producción audiovisual y contenido comercial con IA" />');
const brandedPng = fs.readFileSync(shareImage);
assert.deepEqual([...brandedPng.subarray(0,8)],[137,80,78,71,13,10,26,10],"Valid PNG preview asset");
assert.equal(brandedPng.readUInt32BE(16),1550,"Social image width matches declared metadata");
assert.equal(brandedPng.readUInt32BE(20),600,"Social image height matches declared metadata");
assert.ok(brandedPng.length < 100_000,"Share image remains under 100 KB");
for (const video of ["ugc-beauty.mp4","ugc-fashion.mp4","hyperreal-portrait.mp4"]) {
  const videoMatch = html.match(new RegExp('<video[^>]*aria-label="[^"]+"[^>]*>\\s*<source src="\\./assets/videos/'+video.replace(".","\\.")+'"'));
  assert.ok(videoMatch,"Gallery video has accessible descriptive name: "+video);
}
assert.ok(/<video[^>]*class="hero-video" aria-label="[^"]+"[^>]*>/.test(html),"Hero showreel has descriptive name");

has(html,'class="pricing-secondary-contact section-reveal"');
has(html,'href="#contact" aria-label="Ir al formulario de contacto para enviar tu consulta"');
has(html,'class="contact-brief-hint"');
has(html,'<label for="profileType">Perfil</label>');
has(html,'id="profileType" name="profileType"');
has(html,'<label for="projectType">Tipo de pieza</label>');
has(js,'var profileType = document.getElementById("profileType").value.trim();');
has(js,'profile: pendingMail.profileType');
has(html,'<span id="submitLabel">Enviar consulta</span>');
has(html,'<strong id="formStatusTitle">Consulta enviada</strong>');
has(js,'submitLabel.textContent = "Enviar consulta"');
has(js,'data.success !== true && data.success !== "true"', "Form provider success field must explicitly confirm delivery");
has(js,'throw new Error("submit_not_accepted")', "HTTP 200 with rejected payload must open the error/fallback path");
has(html,'data-mail-provider="default"',"Native mail provider option included");
has(html,'<strong>Mi app de correo</strong>',"Native mail provider is labeled");
has(js,'url = "mailto:" + mail.to + "?subject=" + subject + "&body=" + body;',"Fallback composes email with form values");
has(js,'window.location.href = url;',"Native email handler opens device mail application");
assert.equal(occurrences(html,'data-mail-provider='),4,"Four mail fallback choices");

assert.equal(occurrences(js,'"Enviar propuesta"'),0,"obsolete submission wording removed");
assert.equal(occurrences(html,'aria-labelledby="siloCaseTitle"'),1,"SILO featured campaign replaces the perfume concept");
assert.equal(occurrences(html,'Perfumería de nicho'),0,"removed conceptual perfume card stays removed");
assert.equal(occurrences(html,'SPEC AD · FICTICIO'),0,"Unlicensed spec ads never shipped");
assert.equal(occurrences(html,'project-item-piero'),0,"Piero media excluded from public build");
assert.equal(occurrences(html,'editorial-case-ls2'),0,"LS2 media excluded from public build");
has(html,'./assets/lote-02.css?v=20261027-club-case-3');
assert.ok(fs.existsSync('assets/lote-02.css'),"Lote 02 CSS exists");

assert.ok(!html.includes('10 cupos'),"no artificial scarcity");
has(html, 'id="caseMyWay"');
has(html, 'id="caseMyWay"');
assert.equal(occurrences(html,'class="editorial-index"'),0,'remove category tags from featured videos');
assert.equal(occurrences(html,'class="editorial-footnote"'),0,'remove video footnote tags');
assert.equal(occurrences(html,'class="service-chips"'),0,'remove service badges layered with video cards');
assert.equal(occurrences(html,'class="pricing-pack-badge"'),0,'remove floating tag above the plan video');
assert.equal(occurrences(html,'class="service-kicker"'),3,'three service labels remain distinct');
assert.equal(occurrences(html,'data-umbral-reel'),0,'legacy UMBRAL showcase removed');
assert.equal(occurrences(html,'class="club-workflow-video"'),1,'one video player is reused across the interactive stages');
assert.equal(occurrences(html,'data-club-step'),4,'four interactive Club stages');
assert.equal(occurrences(html,'Una lámpara que no existe.'),0,'replaced the UMBRAL project copy');
assert.equal(occurrences(html,'UMBRAL / 01'),0,'no UMBRAL project heading remains');
has(html,'Del primer ancla <span>al montaje final.</span>');
has(html,'CASO DE ESTUDIO');
has(html,'./assets/cases/club-del-coctel-01/character-sheet.webp');
has(html,'./assets/cases/club-del-coctel-01/generated-scene.mp4');
has(html,'./assets/videos/club-del-coctel.mp4');
has(html,'./assets/club-case.css?v=20261030-scroll-story-1');
has(html,'./assets/club-case.js?v=20261030-scroll-story-1');
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
assert.equal(occurrences(html, 'src="./assets/site.js?v=20261123-editorial-cro-2"'),1);
has(html,'href="./assets/portfolio-refresh.css?v=20261123-editorial-cro-1"');
assert.ok(fs.existsSync("assets/portfolio-refresh.css"),"Portfolio refresh styles exist");
assert.equal(occurrences(html, 'href="./assets/site.css"'), 1);
// Compare against main as ground truth for preservation.
try {
  const baseline = execFileSync("git", ["show", "origin/main:index.html"], {encoding:"utf8"});
  const extractBlock = (source,start,end) => source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
  const packCards = source => [...extractBlock(source,'<section class="section-reveal pricing-packs"','<!-- Methodology').matchAll(/<article class="pricing-pack[\s\S]*?<\/article>/g)].map(match=>match[0]);
  assert.deepEqual(packCards(html),packCards(baseline),"Plan cards, prices, inclusions, notes and conditions stay byte-for-byte unchanged");
  const serviceVideoSources = source => [...extractBlock(source,'<section id="services"','<!-- Paquetes de producción').matchAll(/<source[^>]+src="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(serviceVideoSources(html),serviceVideoSources(baseline),"All three ambient Service video URLs remain unchanged");
  const clubSources = source => [...extractBlock(source,'<section id="caseMyWay"','<section id="services"').matchAll(/(?:src|data-src)="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(clubSources(html),clubSources(baseline),"Club del Cóctel media references remain unchanged");
  const intentionallyRemovedUrls = new Set(["https://www.instagram.com/p/Dd24xgrOr5e/?hl=en","https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/cc882a72-3df6-41a3-8398-619e1e7ba9a9.mp4"]);
  const missing = [...links(baseline)].filter(url => !intentionallyRemovedUrls.has(url) && !links(html).has(url));
  assert.deepEqual(missing, [], "Original external media/link URLs were dropped");
} catch (error) {
  if (!["ENOENT","EPERM"].includes(error?.code)) throw error;
  console.warn("Git unavailable: external URL baseline check omitted.");
}
assert.equal(occurrences(html,'data-editorial-reel'),2,"SILO and Mariana each have one curated video");
assert.equal(occurrences(html,'class="portfolio-project-caption"'),4,"Every gallery project has its own metadata block");
assert.equal(occurrences(html,'class="portfolio-origin"'),7,"All showcased pieces and the Club case disclose their origin");
for(const origin of ["Proyecto Cliente","Concepto / Dirección Creativa","Demo Técnica"])has(html,origin);
has(html,"Avatar de marca:</strong>");
has(html,"personajes consistentes para contenido y Ads, con uso libre para tu marca.");


// Below-fold media loads on visibility; the hero intentionally retains immediate playback.
const videoTags=html.split("<video ").slice(1).map(chunk=>"<video "+chunk.split(">")[0]+">");
const curatedVideoTags=videoTags.filter(tag=>tag.includes("data-editorial-reel"));
assert.equal(curatedVideoTags.length,2,"Two curated video tags exist");
for(const videoTag of curatedVideoTags){
  assert.ok(!videoTag.includes(" autoplay"),"Featured reels must not bypass viewport observer via autoplay attribute");
  assert.ok(videoTag.includes('preload="none"'),"Featured reel defers network preload");
  assert.ok(videoTag.includes('poster="./assets/images/'),"Featured reel retains real poster");
}
const heroTag=videoTags.find(tag=>tag.includes('class="hero-video"'));
assert.ok(heroTag && heroTag.includes('data-autoplay-managed="true"'),"First-screen showreel uses shared autoplay controller");
assert.ok(heroTag.includes('muted') && heroTag.includes('playsinline') && heroTag.includes('preload="none"'),"Hero starts muted, inline and deferred until visible");
assert.ok(heroTag.includes('poster="./assets/images/hero-showreel-poster.svg"'),"Hero video has browser-native poster fallback");
assert.ok(html.includes('data-hero-mobile-poster src="./assets/images/hero-showreel-poster.svg"'),"Hero retains separate visible image fallback");
assert.ok(fs.existsSync("assets/images/hero-showreel-poster.svg"),"Hero fallback asset exists");
assert.ok(fs.readFileSync("assets/images/hero-showreel-poster.svg","utf8").startsWith("<svg"),"Hero fallback is a lightweight local SVG");
has(mobileHeroFallback,"requestVideoFrameCallback","Video reveal waits for a decoded frame");
has(mobileHeroFallback,"if(frameReady&&!video.paused)","Duplicate resume events cannot leave the loading button visible after playback starts");
has(mobileHeroFallback,"prefers-reduced-motion","Autoplay respects reduced motion");
has(mobileHeroFallback,"saveData","Autoplay respects data-saving mode");
has(js,"navigator.connection || navigator.mozConnection || navigator.webkitConnection","Mobile preloader respects data-saving mode");
has(mobileHeroFallback,'["error","abort","stalled"]',"Playback failures retain poster and expose retry");
const clubImages=html.split("<img ").slice(1).map(chunk=>"<img "+chunk.split(">")[0]+">").filter(tag=>tag.includes("./assets/cases/club-del-coctel-01/"));
assert.equal(clubImages.length,5,"Five existing case-study images retained");
for(const img of clubImages){
  assert.ok(img.includes('loading="lazy"') && img.includes('decoding="async"'),"Offscreen case study image is lazy and async");
}
has(premiumJs,'IntersectionObserver');

const archivedProjects = [...html.matchAll(/<article\b[^>]*class="[^"]*\bproject-item\b[^"]*"[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
assert.equal(archivedProjects.filter(card=>card.includes('data-category="ugc"')).length,3,"UGC category contains three real gallery pieces");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="product"')).length,1,"Product category contains one real concept");
assert.equal(archivedProjects.length,4,"archive contains four unique project cards");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="ugc"')).length,3,"three UGC cards, including the SILO client UGC");
assert.equal(archivedProjects.filter(card=>card.includes('data-category="product"')).length,1,"one product concept in the current gallery");
assert.equal(occurrences(html,"silo-campana-producto-recortado.mp4"),1,"SILO reel appears once");
assert.equal(occurrences(html,"club-del-coctel.mp4"),1,"Club reel appears once in its interactive walkthrough");
for (const name of ["silo-campana-producto-recortado.mp4","club-del-coctel.mp4"])
  assert.ok(!archivedProjects.some(card=>card.includes(name)),"archive must not repeat featured video: "+name);
assert.ok(fs.existsSync("assets/videos/club-del-coctel.mp4"), "Club del Cóctel reel asset exists");
assert.ok(fs.statSync("assets/videos/club-del-coctel.mp4").size > 1_000_000, "Club del Cóctel video is not an empty placeholder");
assert.ok(fs.existsSync("assets/images/club-del-coctel.jpg"), "Club del Cóctel poster exists");
assert.equal(occurrences(html,"Perfume real llevado a una estética cinematográfica."),0,"remove duplicate Perfumería IA copy");
assert.equal(occurrences(html,"Lenguaje de campaña en clave UGC."),0,"remove duplicate UGC perfume copy");
assert.equal((html.match(/class="editorial-case(?: editorial-case--silo| editorial-case--mariana)?"/g)||[]).length,2,"two curated client campaigns");
has(html,'Fragancia, detalle y cierre de marca.');
// Curated cases: concrete client and production context without visual overlays.
has(html,'SELECCIÓN / TRABAJOS Y PRODUCCIONES PROPIAS');
has(html,'Casos de cliente y piezas de exploración, con su enfoque y capacidad principal identificados.');
has(html,'Una pieza para SILO que conduce la mirada desde el frasco hasta la identidad de la perfumería.');
has(html,'id="marianaCaseTitle"');
has(html,'Recetas contadas desde la cocina.');
has(html,'./assets/videos/mariana-omelette-ugc.mp4');
has(html,'./assets/images/mariana-omelette-ugc.webp');
assert.ok(fs.statSync('assets/videos/mariana-omelette-ugc.mp4').size > 2_000_000,"Mariana web video is not a stub");
assert.ok(fs.statSync('assets/images/mariana-omelette-ugc.webp').size > 10_000,"Mariana poster exists");
assert.equal(occurrences(html,'id="marianaCaseTitle"'),1,"single Mariana case heading");

has(html,'El desafío fue sostener al mismo bartender, su vestuario y la cocina a lo largo de un reel de 33,8 segundos');
assert.equal(occurrences(html,'class="editorial-overline"'),1,"one shared editorial overline");

has(html,'>Club del Cóctel</strong>', 'Club case identifies its real project');
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
has(html,'hooks alternativos');
has(js,'document.querySelectorAll(".service-example-link[data-service-filter]")');

assert.equal(occurrences(html,'final-trim2.web.mp4'),0,'old UMBRAL video master removed');
assert.equal(occurrences(html,'monument-trim2.web.mp4'),0,'old UMBRAL hero removed');
assert.equal(occurrences(html,'UMBRAL es una lámpara ficticia.'),0,'old conceptual disclaimer removed');
assert.equal(occurrences(html, 'data-category="workflow"'),0,"no workflow gallery tab or card");
assert.equal(occurrences(html, 'data-filter="workflow"'),0,"No workflow category is published; the real filters are All, UGC and Product");
assert.equal(occurrences(html, 'id="system"'),1,"system presentation is standalone");
assert.equal(occurrences(html, 'class="studio-system-conversion section-reveal"'),0,"methodology avoids repeating a second contact banner");
has(html,'href="#contact"');
has(premiumCss,'.studio-system-map');
has(premiumCss,'.studio-system-toolgrid');
assert.equal(occurrences(html,'href="#system"'),2,"desktop and mobile navigation to system");
assert.equal(occurrences(html,'social-proof'),0,"no social proof placeholders");

has(html,'id="projectFilters"');
has(html,'aria-labelledby="siloCaseTitle"');
assert.equal(occurrences(html,'aria-labelledby="clubCaseTitle"'),0,"Club project is not duplicated in the showcase");
has(html,'aria-labelledby="clubWorkflowTitle"');
has(premiumCss,'.editorial-showcase');
assert.equal(occurrences(premiumCss,'.editorial-media-note'),0,'no floating caption style over featured videos');
has(premiumJs,'IntersectionObserver');
has(premiumJs,'video.dataset.userUnmuted');
has(premiumJs,'window.__PATO_ACTIVATE_VIDEO_AUDIO__=activate');
assert.equal(occurrences(html,'editorial-campaign-tag'),0,'video copy is not injected as an HTML badge');
assert.equal(occurrences(html,'editorial-play-control'),0,'video pause/play buttons are removed');
assert.equal(occurrences(html,'data-audio-available="true"'),4,'four current original-audio videos expose their audio');
assert.equal(occurrences(html,'data-umbral-audio'),0,'no obsolete UMBRAL audio UI remains');
assert.equal(occurrences(html,'href="./assets/premium-lab.css?v=20261123-header-playback-1"'),1);
assert.equal(occurrences(html,'href="./assets/lote-02.css?v=20261027-club-case-3"'),1);
assert.equal(occurrences(html,'id="clubWorkflowTitle"'),1,'interactive project title has a unique id');
assert.equal(occurrences(html,'id="portfolio-nav-critical"'),1,"critical navbar rules embedded in delivered HTML");
const criticalNavStyle=html.slice(html.indexOf('<style id="portfolio-nav-critical">'),html.indexOf('</style>',html.indexOf('<style id="portfolio-nav-critical">')));
for(const rule of ['#portfolioHeader .portfolio-nav-layout','#portfolioHeader .portfolio-nav-links','#portfolioHeader .portfolio-mobile-menu.is-open','@media(max-width:1299px)'])has(criticalNavStyle,rule);
assert.ok(html.indexOf('id="portfolio-nav-critical"') < html.indexOf('</head>'),"critical navbar styles load before any page content");
assert.ok(criticalNavStyle.includes('position:fixed;inset:0 0 auto;z-index:1000;'),"navbar position does not depend on Tailwind runtime");

assert.equal(occurrences(html,'src="./assets/premium-lab.js?v=20261122-mobile-playback-3"'),1,'versioned premium runtime is loaded exactly once');
assert.equal(occurrences(html,'class="pc-method-six-number"'),6,"six-stage methodology remains visible");
assert.equal(occurrences(html,'class="pc-collab-column"'),3,"three collaboration responsibility columns");
assert.equal(occurrences(html,'class="pc-audience-grid"'),1,"brand and agency comparison is unique");
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


assert.equal(occurrences(html,'class="tool-pipeline-card tool-pipeline-direction"'),0,"obsolete tool stack cards are not shown as a second method");
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
