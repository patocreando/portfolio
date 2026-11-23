// Cross-engine media fallback smoke: Firefox and WebKit, desktop and mobile-sized viewports.
const { firefox, webkit } = require("playwright");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = process.cwd();
const types = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".webp":"image/webp",
  ".jpg":"image/jpeg"
};
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,"http://localhost");
    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const target = path.resolve(root,"."+pathname);
    if (!target.startsWith(root+path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(target);
    res.writeHead(200,{"content-type":types[path.extname(target)] || "application/octet-stream","content-length":data.length});
    res.end(data);
  } catch { res.writeHead(404).end(); }
});

(async function main() {
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url = "http://127.0.0.1:"+server.address().port+"/";
  try {
    for (const engine of [{name:"Firefox",type:firefox},{name:"WebKit",type:webkit}]) {
      const browser = await engine.type.launch({headless:true});
      try {
        for (const spec of [
          {name:"desktop",width:1366,height:900,mobile:false},
          {name:"mobile",width:390,height:844,mobile:engine.name==="WebKit"}
        ]) {
          const context = await browser.newContext({
            viewport:{width:spec.width,height:spec.height},
            ...(spec.mobile ? {isMobile:true,hasTouch:true} : {}),
            reducedMotion:"no-preference"
          });
          await context.route("**/*.mp4",route=>route.abort());
          await context.route("**/tracker.metricool.com/**",route=>route.abort());
          const page = await context.newPage();
          const errors=[];
          page.on("pageerror",error=>errors.push(error.message));
          await page.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
          await page.waitForFunction(()=>{
            const image=document.querySelector(".hero-video-poster");
            return image && image.complete && image.naturalWidth>0;
          },null,{timeout:15000});
          await page.waitForTimeout(900);
          const state = await page.evaluate(()=>{
            const screen=document.querySelector(".hero-phone-screen");
            const video=screen.querySelector(".hero-video");
            const image=screen.querySelector(".hero-video-poster");
            const button=screen.querySelector("[data-hero-mobile-play]");
            return {
              posterLoaded:image.complete && image.naturalWidth>0,
              posterOpacity:getComputedStyle(image).opacity,
              videoOpacity:getComputedStyle(video).opacity,
              muted:video.muted,
              playsInline:video.hasAttribute("playsinline") && video.hasAttribute("webkit-playsinline"),
              frameReady:screen.classList.contains("is-video-ready") && video.videoWidth>0 && video.videoHeight>0,
              buttonVisible:!button.hidden,
              buttonText:button.querySelector("span")?.textContent,
              videoError:Boolean(video.error)
            };
          });
          assert.equal(state.posterLoaded,true,engine.name+" "+spec.name+": poster image decodes");
          assert.equal(state.playsInline,true,engine.name+" "+spec.name+": inline playback attributes remain set");
          assert.equal(state.muted,true,engine.name+" "+spec.name+": video is muted by default");
          assert.ok(state.frameReady || (state.buttonVisible && state.posterOpacity==="1" && state.videoOpacity==="0"),
            engine.name+" "+spec.name+": unsupported/blocked video must keep poster and retry control");
          if (!state.frameReady) {
            await page.locator("[data-hero-mobile-play]").click();
            await page.waitForTimeout(500);
            const retry = await page.evaluate(()=>{
              const screen=document.querySelector(".hero-phone-screen");
              const image=screen.querySelector(".hero-video-poster");
              const video=screen.querySelector(".hero-video");
              const button=screen.querySelector("[data-hero-mobile-play]");
              return {posterVisible:getComputedStyle(image).opacity==="1",buttonVisible:!button.hidden,videoOpacity:getComputedStyle(video).opacity};
            });
            assert.ok(retry.posterVisible && retry.buttonVisible && retry.videoOpacity==="0",
              engine.name+" "+spec.name+": manual retry failure still preserves the poster");
          }
          console.log(JSON.stringify({engine:engine.name,viewport:spec.name,...state,pageErrors:errors.slice(0,4)}));
          await context.close();
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
