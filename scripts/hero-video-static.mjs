import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("index.html","utf8");
const css = fs.readFileSync("assets/site.css","utf8");
const mobileCss = fs.readFileSync("assets/mobile-stability.css","utf8");
const fallback = fs.readFileSync("assets/mobile-hero-fallback.js","utf8");
const siteJs = fs.readFileSync("assets/site.js","utf8");
const videoPath = "assets/videos/hero-showreel-mobile-compatible.mp4";
const posterPath = "assets/images/hero-showreel-poster.png";
const heroTag = html.match(/<video\b(?=[^>]*\bclass="hero-video")[^>]*>/s)?.[0];
const posterTag = html.match(/<img\b(?=[^>]*\bdata-hero-mobile-poster)[^>]*>/s)?.[0];

assert.ok(heroTag,"Hero video tag exists");
assert.ok(posterTag,"Independent poster image exists");
for (const attr of ["muted","playsinline","webkit-playsinline",'preload="none"']) {
  assert.ok(heroTag.includes(attr),"Hero has playback attribute: "+attr);
}
assert.ok(!/\scontrols(?:\s|>)/.test(heroTag),"Hero never displays native browser controls");
assert.ok(!/\sautoplay(?:\s|>)/.test(heroTag),"Autoplay is policy-aware and controlled by JavaScript");
assert.ok(heroTag.includes('poster="./assets/images/hero-showreel-poster.png?v=20261123-hero-cross-browser-1"'),
  "Video poster URL points to the extracted showreel frame");
assert.ok(html.includes('type=\'video/mp4; codecs="avc1.42401f, mp4a.40.2"\''),
  "Video source declares the exact H264 Constrained Baseline and AAC-LC codecs");
assert.ok(fallback.includes('video.canPlayType(sourceType) !== ""'),
  "Playback controller detects unsupported codecs before attempting playback");
assert.ok(fallback.includes('heroSourceUnsupported'),
  "Unsupported codec path falls back to the real poster without a dead play button");
assert.ok(posterTag.includes('src="./assets/images/hero-showreel-poster.png?v=20261123-hero-cross-browser-1"'),
  "Visible fallback and native video poster share the same local asset");
assert.ok(html.includes('href="./assets/images/hero-showreel-poster.png?v=20261123-hero-cross-browser-1"'),
  "Hero still is preloaded with high priority");
assert.equal((html.match(/mobile-hero-fallback\.js/g)||[]).length,1,"One hero playback controller is loaded");

for (const token of [
  "video.play()",
  "requestVideoFrameCallback",
  'video.addEventListener("loadeddata"',
  'video.addEventListener("stalled"',
  'video.addEventListener("error"',
  ".catch(function ()",
  "prefers-reduced-motion: reduce",
  "saveData"
]) {
  assert.ok(fallback.includes(token),"Hero controller handles "+token);
}
assert.ok(siteJs.includes("respectDataPreferences"),"Mobile layout controller respects data and motion preferences");
assert.ok(siteJs.includes('document.querySelectorAll(".project-video")'),"In-app optimizer is isolated from the hero controller");
assert.ok(!siteJs.includes('document.querySelectorAll(".hero-video, .project-video")'),"No competing in-app loader reassigns the hero source");
assert.ok(siteJs.includes('video.removeAttribute("autoplay")'),"Mobile layout controller does not bypass the preference-aware player");

for (const selector of [
  "#heroDeviceWrap .hero-mobile-poster",
  "#heroDeviceWrap .hero-phone-screen.is-video-ready .hero-mobile-poster",
  "#heroDeviceWrap .hero-phone-screen.is-video-ready .hero-video",
  "#heroDeviceWrap .hero-mobile-play[hidden]"
]) assert.ok(css.includes(selector),"Desktop poster/prompt styling exists: "+selector);

for (const selector of [
  "#top .hero-mobile-poster",
  "#top .hero-phone-screen.is-video-ready .hero-mobile-poster",
  "#top .hero-phone-screen.is-video-ready .hero-video"
]) assert.ok(mobileCss.includes(selector),"Mobile poster/video state exists: "+selector);
assert.ok(!mobileCss.includes("#top .hero-mobile-poster {\n    display: none !important;"),
  "Mobile CSS does not suppress the real fallback image");

assert.ok(fs.existsSync(videoPath),"Optimized hero MP4 exists");
assert.ok(fs.existsSync(posterPath),"Generated hero poster exists");
const videoBytes = fs.statSync(videoPath).size;
const posterBytes = fs.statSync(posterPath).size;
assert.ok(videoBytes > 100_000 && videoBytes < 6_000_000,"Hero MP4 is a compact web asset: "+videoBytes);
assert.ok(posterBytes > 10_000 && posterBytes < 1_800_000,"Hero PNG poster remains an optimized web asset: "+posterBytes);

console.log(JSON.stringify({
  status:"passed",
  videoBytes,
  posterBytes,
  desktopAndMobileFallbacks:true,
  autoplayPolicyAware:true
},null,2));
