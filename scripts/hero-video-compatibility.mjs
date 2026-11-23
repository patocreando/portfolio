// Real browser-engine checks for the hero media pipeline.
// Runs locally in GitHub Actions with Chromium, Firefox and WebKit.
import { chromium, firefox, webkit } from "playwright";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const mime = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".mp4":"video/mp4"
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const body = await fs.readFile(file);
    const type = mime[path.extname(file).toLowerCase()] || "application/octet-stream";
    if (path.extname(file).toLowerCase() === ".mp4") {
      res.setHeader("accept-ranges","bytes");
      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) { res.writeHead(416,{"content-range":"bytes */"+body.length}).end(); return; }
        let start, end;
        if (!match[1]) {
          const suffix = Number(match[2]);
          start = Math.max(0,body.length-suffix);
          end = body.length-1;
        } else {
          start = Number(match[1]);
          end = match[2] ? Math.min(Number(match[2]),body.length-1) : body.length-1;
        }
        if (start >= body.length || end < start) {
          res.writeHead(416,{"content-range":"bytes */"+body.length}).end();
          return;
        }
        const chunk = body.subarray(start,end+1);
        res.writeHead(206,{
          "content-type":type,
          "content-length":chunk.length,
          "content-range":"bytes "+start+"-"+end+"/"+body.length,
          "accept-ranges":"bytes",
          "cache-control":"no-store"
        });
        res.end(chunk);
        return;
      }
      res.writeHead(200,{
        "content-type":type,
        "content-length":body.length,
        "accept-ranges":"bytes",
        "cache-control":"no-store"
      });
      res.end(body);
      return;
    }
    res.writeHead(200,{"content-type":type,"cache-control":"no-store"});
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});

const viewports = [
  {name:"iphone-width",width:390,height:844,isMobile:true,hasTouch:true},
  {name:"ipad-portrait",width:768,height:1024,isMobile:false,hasTouch:true},
  {name:"ipad-landscape",width:1024,height:768,isMobile:false,hasTouch:true},
  {name:"desktop",width:1366,height:900,isMobile:false,hasTouch:false}
];

function engineContext(engineName, options) {
  const configured = {...options};
  // Firefox supports responsive viewport widths but not Playwright's isMobile
  // or hasTouch device emulation flags.
  if (engineName === "firefox") {
    delete configured.isMobile;
    delete configured.hasTouch;
  }
  return configured;
}

async function waitForPoster(page, label = "unknown browser/viewport") {
  const posterNetwork = [];
  const record = (event, request, response) => {
    if (!request.url().includes("hero-showreel-poster")) return;
    posterNetwork.push({
      event,
      url:request.url(),
      status:response?.status() ?? null,
      contentType:response?.headers()["content-type"] ?? null,
      contentLength:response?.headers()["content-length"] ?? null,
      failure:request.failure()?.errorText ?? null
    });
  };
  const onRequest = request => record("request",request);
  const onResponse = response => record("response",response.request(),response);
  const onFailure = request => record("requestfailed",request);
  page.on("request",onRequest);
  page.on("response",onResponse);
  page.on("requestfailed",onFailure);
  try {
    await page.waitForFunction(() => {
      const img = document.querySelector("[data-hero-mobile-poster]");
      return Boolean(img && img.complete && img.naturalWidth > 0);
    }, null, {timeout:12000});
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const img = document.querySelector("[data-hero-mobile-poster]");
      const video = document.querySelector(".hero-video");
      return {
        documentReadyState:document.readyState,
        poster:img ? {
          src:img.getAttribute("src"),
          currentSrc:img.currentSrc,
          complete:img.complete,
          naturalWidth:img.naturalWidth,
          naturalHeight:img.naturalHeight,
          loading:img.loading,
          decoding:img.decoding,
          display:getComputedStyle(img).display,
          visibility:getComputedStyle(img).visibility,
          opacity:getComputedStyle(img).opacity
        } : null,
        videoPoster:video?.poster || null,
        sourceSupported:video?.dataset.heroSourceSupported || null,
        imageResources:performance.getEntriesByType("resource")
          .filter(entry=>/hero-showreel-poster/.test(entry.name))
          .map(entry=>({name:entry.name,duration:entry.duration,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize}))
      };
    }).catch(e=>({diagnosticError:String(e)}));
    const fetchDiagnostics = await page.evaluate(async () => {
      const img = document.querySelector("[data-hero-mobile-poster]");
      if (!img) return null;
      try {
        const response = await fetch(img.currentSrc || img.src,{cache:"no-store"});
        const blob = await response.blob();
        let bitmap = null;
        if (typeof createImageBitmap === "function") {
          try {
            const decoded = await createImageBitmap(blob);
            bitmap = {width:decoded.width,height:decoded.height};
            decoded.close();
          } catch (e) { bitmap = {error:String(e)}; }
        }
        return {status:response.status,contentType:response.headers.get("content-type"),bytes:blob.size,bitmap};
      } catch (e) { return {fetchError:String(e)}; }
    }).catch(e=>({diagnosticError:String(e)}));
    page.off("request",onRequest);
    page.off("response",onResponse);
    page.off("requestfailed",onFailure);
    throw new Error(label + " poster image did not decode: " + JSON.stringify({diagnostics,fetchDiagnostics,posterNetwork}) + "; " + error.message);
  }
}

async function heroState(page) {
  return page.evaluate(() => {
    const screen = document.querySelector("#heroDeviceWrap .hero-phone-screen");
    const video = screen?.querySelector(".hero-video");
    const poster = screen?.querySelector("[data-hero-mobile-poster]");
    const button = screen?.querySelector("[data-hero-mobile-play]");
    if (!screen || !video || !poster || !button) return null;

    const imageStyle = getComputedStyle(poster);
    const videoStyle = getComputedStyle(video);
    const buttonStyle = getComputedStyle(button);
    const screenRect = screen.getBoundingClientRect();

    return {
      source: video.currentSrc || video.querySelector("source")?.src || "",
      poster: video.poster,
      muted: video.muted,
      playsInline: video.playsInline,
      canPlayMp4: video.canPlayType("video/mp4"),
      canPlayH264Aac: video.canPlayType('video/mp4; codecs="avc1.42401f, mp4a.40.2"'),
      sourceSupported: video.dataset.heroSourceSupported === "true",
      sourceElement: {
        src: video.querySelector("source")?.getAttribute("src") || "",
        type: video.querySelector("source")?.getAttribute("type") || ""
      },
      controls: video.controls,
      paused: video.paused,
      readyState: video.readyState,
      networkState: video.networkState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      mediaError: video.error ? {code:video.error.code,message:video.error.message} : null,
      frameReady: screen.classList.contains("is-video-ready"),
      posterLoaded: poster.complete && poster.naturalWidth > 0,
      posterVisible: imageStyle.display !== "none" && imageStyle.visibility !== "hidden" && Number(imageStyle.opacity) > 0.05,
      videoOpacity: Number(videoStyle.opacity),
      playButtonVisible: !button.hidden && buttonStyle.display !== "none" && buttonStyle.visibility !== "hidden",
      playButtonLabel: button.querySelector("span")?.textContent || "",
      screenWidth: screenRect.width,
      screenHeight: screenRect.height
    };
  });
}

async function assertNoBlankHero(page, label) {
  const state = await heroState(page);
  assert.ok(state, label + ": hero elements exist");
  assert.ok(state.posterLoaded, label + ": real poster image decoded");
  assert.ok(state.screenWidth > 100 && state.screenHeight > 100, label + ": hero screen retains layout dimensions");
  assert.equal(state.controls, false, label + ": no unexpected native controls");
  assert.equal(state.playsInline, true, label + ": inline playback attribute is active");

  if (state.frameReady) {
    assert.ok(state.videoWidth > 0 && state.videoHeight > 0, label + ": ready state represents a real video frame");
    assert.ok(state.videoOpacity > 0.9, label + ": decoded video frame is visible");
  } else {
    assert.ok(state.posterVisible, label + ": poster remains visible when video is not ready");
    assert.ok(state.videoOpacity < 0.1, label + ": undecoded video cannot cover the fallback with black");
    if (state.sourceSupported) {
      assert.ok(state.playButtonVisible || state.mediaError, label + ": blocked/failed playback has a visible fallback state");
    } else {
      assert.equal(state.playButtonVisible, false, label + ": unsupported codec does not expose a nonfunctional play control");
    }
  }
  return state;
}

async function run() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = "http://127.0.0.1:" + server.address().port + "/";
  const engines = [
    ["chrome",chromium,{channel:"chrome"}],
    ["firefox",firefox,{}],
    ["webkit",webkit,{}]
  ];
  const summaries = [];

  try {
    for (const [engineName,engine,launchOptions] of engines) {
      const browser = await engine.launch({headless:true,...launchOptions});
      try {
        // Real source path, all target layout classes, and autoplay allowed/rejected
        // by each engine's own media policy. Either a real frame or the poster
        // plus an actionable play prompt must be visible.
        for (const spec of viewports) {
          const context = await browser.newContext(engineContext(engineName,{
            viewport:{width:spec.width,height:spec.height},
            isMobile:spec.isMobile,
            hasTouch:spec.hasTouch,
            deviceScaleFactor:1,
            reducedMotion:"no-preference"
          }));
          const page = await context.newPage();
          const pageErrors = [];
          const mediaNetwork = [];
          page.on("pageerror", error => pageErrors.push(error.message));
          page.on("request", request => {
            if (request.url().includes("hero-showreel-mobile-compatible.mp4")) {
              mediaNetwork.push({event:"request",url:request.url(),range:request.headers()["range"] || null});
            }
          });
          page.on("requestfailed", request => {
            if (request.url().includes("hero-showreel-mobile-compatible.mp4")) {
              mediaNetwork.push({event:"requestfailed",failure:request.failure()?.errorText || "unknown"});
            }
          });
          page.on("response", response => {
            if (response.url().includes("hero-showreel-mobile-compatible.mp4")) {
              mediaNetwork.push({event:"response",status:response.status(),contentType:response.headers()["content-type"] || null,contentRange:response.headers()["content-range"] || null});
            }
          });
          await page.route("**/tracker.metricool.com/**", route => route.abort());
          await page.goto(baseUrl, {waitUntil:"domcontentloaded",timeout:90000});
          // Bring the hero into the viewport so the controller's visibility gate
          // can request playback instead of leaving the video in metadata-only mode.
          await page.locator("#heroDeviceWrap").scrollIntoViewIfNeeded();
          await waitForPoster(page,engineName + "/" + spec.name);
          try {
            await page.waitForFunction(() => {
              const screen = document.querySelector("#heroDeviceWrap .hero-phone-screen");
              const video = screen?.querySelector(".hero-video");
              const button = screen?.querySelector("[data-hero-mobile-play]");
              const label = button?.querySelector("span")?.textContent || "";
              return Boolean(screen?.classList.contains("is-video-ready") ||
                video?.error || video?.dataset.heroSourceUnsupported === "true" ||
                label === "Tocar para reproducir" || label === "Reintentar showreel");
            }, null, {timeout:18000});
          } catch (error) {
            const diagnostics = await heroState(page);
            throw new Error(engineName + "/" + spec.name + " did not produce a frame or autoplay fallback: " +
              JSON.stringify(diagnostics) + "; mediaNetwork=" + JSON.stringify(mediaNetwork) +
              "; pageErrors=" + pageErrors.join(" | "));
          }

          // CSS fades the decoded frame in over 180ms. Wait for the visual
          // transition, not just the media-frame callback, before asserting it.
          await page.waitForFunction(() => {
            const screen = document.querySelector("#heroDeviceWrap .hero-phone-screen");
            const video = screen?.querySelector(".hero-video");
            return Boolean(screen?.classList.contains("is-video-ready") &&
              video && Number.parseFloat(getComputedStyle(video).opacity) > 0.9);
          }, null, {timeout:3000}).catch(async () => {
            const diagnostic = await heroState(page);
            if (!diagnostic?.frameReady) return;
            throw new Error(engineName + "/" + spec.name + " decoded frame did not become visually opaque: " +
              JSON.stringify(diagnostic));
          });
          const state = await assertNoBlankHero(page, engineName + "/" + spec.name);
          if (pageErrors.length) {
            throw new Error(engineName + "/" + spec.name + ": page errors: " + pageErrors.join(" | "));
          }
          await fs.mkdir("artifacts/hero-cross-browser", {recursive:true});
          await page.screenshot({
            path:"artifacts/hero-cross-browser/" + engineName + "-" + spec.name + ".png",
            fullPage:false,
            animations:"disabled"
          });
          summaries.push({
            engine:engineName,
            viewport:spec.name,
            frameReady:state.frameReady,
            mediaError:state.mediaError?.code || null,
            posterVisible:state.posterVisible,
            playButtonVisible:state.playButtonVisible
          });
          await context.close();
        }

        // Reduced-motion preference: do not autoplay or download the video;
        // preserve the hero still and provide the user's explicit play action.
        {
          const context = await browser.newContext(engineContext(engineName,{
            viewport:{width:390,height:844},
            isMobile:true,
            hasTouch:true,
            deviceScaleFactor:1,
            reducedMotion:"reduce"
          }));
          const page = await context.newPage();
          let mediaRequests = 0;
          page.on("request", request => {
            if (request.url().includes("hero-showreel-mobile-compatible.mp4")) mediaRequests += 1;
          });
          await page.goto(baseUrl, {waitUntil:"domcontentloaded",timeout:90000});
          await waitForPoster(page,engineName + "/special-scenario");
          await page.waitForFunction(() => {
            const video = document.querySelector(".hero-video");
            const button = document.querySelector("[data-hero-mobile-play]");
            return Boolean(video && (video.dataset.heroSourceSupported === "true" ||
              video.dataset.heroSourceUnsupported === "true") && (video.dataset.heroSourceUnsupported === "true" || (button && !button.hidden)));
          }, null, {timeout:10000});
          const state = await heroState(page);
          assert.ok(state.posterVisible,engineName + ": reduced motion keeps the actual poster visible");
          assert.equal(state.frameReady,false,engineName + ": reduced motion does not force playback");
          assert.equal(state.paused,true,engineName + ": reduced motion leaves the video paused");
          if (state.sourceSupported) {
            assert.ok(state.playButtonVisible,engineName + ": reduced motion offers explicit playback");
          } else {
            assert.equal(state.playButtonVisible,false,engineName + ": unsupported codec retains a poster-only fallback");
          }
          assert.equal(mediaRequests,0,engineName + ": reduced motion does not request the large MP4");
          summaries.push({engine:engineName,scenario:"reduced-motion",pass:true,mediaRequests,sourceSupported:state.sourceSupported});
          await context.close();
        }

        // Fatal load failure: the image remains fully rendered and native controls
        // are never exposed, even when the MP4 request cannot be retrieved.
        {
          const context = await browser.newContext(engineContext(engineName,{
            viewport:{width:390,height:844},
            isMobile:true,
            hasTouch:true,
            deviceScaleFactor:1,
            reducedMotion:"no-preference"
          }));
          const page = await context.newPage();
          await page.goto(baseUrl, {waitUntil:"domcontentloaded",timeout:90000});
          await waitForPoster(page,engineName + "/special-scenario");
          await page.locator("#heroDeviceWrap").scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          const initialState = await heroState(page);
          if (!initialState.sourceSupported) {
            assert.ok(initialState.posterVisible,engineName + ": unsupported codec keeps poster visible under media failure");
            summaries.push({engine:engineName,scenario:"media-error-not-applicable-unsupported-codec",posterVisible:initialState.posterVisible});
          } else {
            await page.locator(".hero-video").evaluate((video, missingUrl) => {
              video.pause();
              video.preload = "auto";
              video.src = missingUrl;
              video.load();
            }, baseUrl + "__missing_hero_media__.mp4");
            await page.waitForFunction(() => {
              const video = document.querySelector(".hero-video");
              const screen = document.querySelector("#heroDeviceWrap .hero-phone-screen");
              const poster = screen?.querySelector("[data-hero-mobile-poster]");
              if (!video?.error || !screen || screen.classList.contains("is-video-ready") || !poster) return false;
              const posterOpacity = Number.parseFloat(getComputedStyle(poster).opacity);
              const videoOpacity = Number.parseFloat(getComputedStyle(video).opacity);
              return posterOpacity > 0.9 && videoOpacity < 0.1;
            }, null, {timeout:3000});
            const state = await assertNoBlankHero(page,engineName + "/media-error");
            assert.ok(state.mediaError,engineName + ": media error is detected");
            assert.ok(state.posterVisible,engineName + ": poster survives fatal media error");
            summaries.push({engine:engineName,scenario:"media-error",errorCode:state.mediaError.code,posterVisible:state.posterVisible});
          }
          await context.close();
        }

        // Simulated autoplay-policy rejection: only a user gesture can start the
        // video, so the poster and manual play prompt must remain available.
        {
          const context = await browser.newContext(engineContext(engineName,{
            viewport:{width:390,height:844},
            isMobile:true,
            hasTouch:true,
            deviceScaleFactor:1,
            reducedMotion:"no-preference"
          }));
          await context.addInitScript(() => {
            const nativePlay = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function () {
              if (this.classList && this.classList.contains("hero-video")) {
                return Promise.reject(new DOMException("Autoplay blocked for QA","NotAllowedError"));
              }
              return nativePlay.apply(this,arguments);
            };
          });
          const page = await context.newPage();
          await page.goto(baseUrl,{waitUntil:"domcontentloaded",timeout:90000});
          await waitForPoster(page,engineName + "/special-scenario");
          await page.locator("#heroDeviceWrap").scrollIntoViewIfNeeded();
          const stateBefore = await heroState(page);
          if (!stateBefore.sourceSupported) {
            assert.ok(stateBefore.posterVisible,engineName + ": unsupported codec keeps the real poster as fallback");
            summaries.push({engine:engineName,scenario:"autoplay-rejected-not-applicable-unsupported-codec",posterVisible:stateBefore.posterVisible});
          } else {
            await page.waitForFunction(() => {
              const button = document.querySelector("[data-hero-mobile-play]");
              const label = button?.querySelector("span")?.textContent || "";
              const video = document.querySelector(".hero-video");
              return Boolean(label === "Tocar para reproducir" || label === "Reintentar showreel" || video?.error);
            }, null, {timeout:15000});
            await page.waitForFunction(() => {
              const screen = document.querySelector("#heroDeviceWrap .hero-phone-screen");
              const video = screen?.querySelector(".hero-video");
              const poster = screen?.querySelector("[data-hero-mobile-poster]");
              if (!screen || !video || !poster) return false;
              const videoOpacity = Number.parseFloat(getComputedStyle(video).opacity);
              const posterOpacity = Number.parseFloat(getComputedStyle(poster).opacity);
              return screen.classList.contains("is-video-ready")
                ? videoOpacity > 0.9
                : posterOpacity > 0.9 && videoOpacity < 0.1;
            }, null, {timeout:3000});
            const state = await assertNoBlankHero(page,engineName + "/autoplay-blocked");
            assert.ok(state.playButtonVisible || state.mediaError,engineName + ": autoplay rejection exposes a manual recovery action");
            assert.ok(state.posterVisible || state.frameReady,engineName + ": no black screen after autoplay rejection");
            summaries.push({engine:engineName,scenario:"autoplay-rejected",playButtonVisible:state.playButtonVisible,posterVisible:state.posterVisible});
          }
          await context.close();
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log(JSON.stringify({status:"passed",checks:summaries.length,results:summaries},null,2));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
