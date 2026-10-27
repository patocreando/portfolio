/* Content reels start muted. Click/tap a video to play its original audio; click again to pause. */
(function () {
  "use strict";
  var videos=Array.prototype.slice.call(document.querySelectorAll("video[data-editorial-reel], video.project-video, video.hero-video, video.club-workflow-video"));
  if(!videos.length) return;
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  var visible=new WeakMap();
  function pause(video) { try {video.pause();} catch(error) {} }
  function promptFor(video) {
    var host=video.closest(".editorial-media-stack")||video.closest(".project-item");
    return host?host.querySelector("[data-video-audio-prompt]"):null;
  }
  function syncAudioPrompt(video) {
    var button=promptFor(video);
    if(!button)return;
    var active=window.__PATO_SOUND_ACTIVE_VIDEO__===video&&!video.muted&&!video.paused;
    button.setAttribute("aria-pressed",String(active));
    var label=button.querySelector("[data-audio-prompt-label]");
    if(label)label.textContent=active?"Pausar audio":"Escuchar audio";
  }
  function setMuted(video,muted) {
    var shouldMute=muted||video.dataset.audioAvailable!=="true";
    video.dataset.userUnmuted=String(!shouldMute);
    video.muted=shouldMute;
    video.defaultMuted=shouldMute;
    video.volume=shouldMute?0:1;
    if(shouldMute) video.setAttribute("muted","");
    else video.removeAttribute("muted");
  }
  function stopOthers(active) {
    videos.forEach(function(video){
      if(video===active)return;
      video.dataset.userPaused="true";
      setMuted(video,true);
      pause(video);
      syncAudioPrompt(video);
    });
  }
  window.__PATO_STOP_ACTIVE_VIDEO__=function(except){
    videos.forEach(function(video){
      if(video===except)return;
      video.dataset.userPaused="true";
      setMuted(video,true);
      pause(video);
      syncAudioPrompt(video);
    });
    if(window.__PATO_SOUND_ACTIVE_VIDEO__!==except)window.__PATO_SOUND_ACTIVE_VIDEO__=null;
  };
  function play(video,manual) {
    if(!manual&&video.dataset.userPaused==="true")return;
    if(!manual && (document.hidden||reduced.matches||!visible.get(video))) return;
    if(video.preload==="none") video.preload="metadata";
    var audible=video.dataset.userUnmuted==="true";
    setMuted(video,!audible);
    var promise; try {promise=video.play();} catch(error) {}
    if(promise && typeof promise.catch==="function") promise.catch(function(){
      setMuted(video,true);
      if(window.__PATO_SOUND_ACTIVE_VIDEO__===video) window.__PATO_SOUND_ACTIVE_VIDEO__=null;
    });
  }
  function activate(video,event) {
    if(event){event.preventDefault();event.stopPropagation();}
    var hasAudio=video.dataset.audioAvailable==="true";
    var alreadyActive=!video.paused&&!video.ended&&video.dataset.userPaused!=="true";
    var alreadyAudible=hasAudio&&alreadyActive&&!video.muted&&video.dataset.userUnmuted==="true";
    if(alreadyAudible||(!hasAudio&&alreadyActive)){
      video.dataset.userPaused="true";
      pause(video);
      setMuted(video,true);
      if(window.__PATO_SOUND_ACTIVE_VIDEO__===video) window.__PATO_SOUND_ACTIVE_VIDEO__=null;
      syncAudioPrompt(video);
      return;
    }
    stopOthers(video);
    video.dataset.userPaused="false";
    setMuted(video,!hasAudio);
    window.__PATO_SOUND_ACTIVE_VIDEO__=video;
    play(video,true);
    syncAudioPrompt(video);
  }
  function stopAudioOutsideViewport() {
    var active=window.__PATO_SOUND_ACTIVE_VIDEO__;
    if(!active)return;
    var rect=active.getBoundingClientRect();
    var visibleHeight=Math.max(0,Math.min(rect.bottom,window.innerHeight)-Math.max(rect.top,0));
    if(visibleHeight/Math.max(rect.height,1)<.18){
      active.dataset.userPaused="true";
      setMuted(active,true);
      pause(active);
      window.__PATO_SOUND_ACTIVE_VIDEO__=null;
      syncAudioPrompt(active);
    }
  }
  window.__PATO_ACTIVATE_VIDEO_AUDIO__=activate;
  videos.forEach(function(video){
    video.tabIndex=0;
    video.setAttribute("aria-keyshortcuts","Enter Space");
    var label=video.getAttribute("aria-label")||"Video";
    var instruction=video.dataset.audioAvailable==="true"
      ?"Toca o presiona Enter para escuchar el audio original; vuelve a tocar para pausar."
      :"Toca o presiona Enter para reproducir o pausar.";
    video.setAttribute("aria-label",label+". "+instruction);
    video.addEventListener("click",function(event){activate(video,event);});
    video.addEventListener("keydown",function(event){
      if(event.key==="Enter"||event.key===" ")activate(video,event);
    });
    video.addEventListener("pointerenter",function(){
      var active=window.__PATO_SOUND_ACTIVE_VIDEO__;
      if(active&&active!==video){active.dataset.userPaused="true";setMuted(active,true);pause(active);window.__PATO_SOUND_ACTIVE_VIDEO__=null;syncAudioPrompt(active);}
    });
    video.addEventListener("play",function(){syncAudioPrompt(video);});
    video.addEventListener("pause",function(){syncAudioPrompt(video);});
    video.addEventListener("volumechange",function(){syncAudioPrompt(video);});
    var prompt=promptFor(video);
    if(prompt){
      prompt.addEventListener("click",function(event){activate(video,event);});
      syncAudioPrompt(video);
    }
  });
  var reels=videos.filter(function(video){return video.hasAttribute("data-editorial-reel");});
  if("IntersectionObserver" in window) {
    var observer=new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var video=entry.target, isVisible=entry.isIntersecting&&entry.intersectionRatio>=.22;
        visible.set(video,isVisible);
        if(isVisible) play(video); else pause(video);
      });
    },{rootMargin:"120px 0px 120px 0px",threshold:[0,.22,.5]});
    reels.forEach(function(video){observer.observe(video);});
  } else {
    reels.forEach(function(video){visible.set(video,true);play(video);});
  }
  document.addEventListener("visibilitychange",function(){
    videos.forEach(function(video){if(document.hidden){setMuted(video,true);pause(video);syncAudioPrompt(video);}});
    if(document.hidden)window.__PATO_SOUND_ACTIVE_VIDEO__=null;
  });
  window.addEventListener("scroll",stopAudioOutsideViewport,{passive:true});
  window.addEventListener("resize",stopAudioOutsideViewport,{passive:true});
  if(typeof reduced.addEventListener==="function")
    reduced.addEventListener("change",function(){reels.forEach(function(video){if(reduced.matches){setMuted(video,true);pause(video);} else play(video);});});
})();


/* Decorative system background: muted, lazy and viewport-controlled.
   Reuses an existing source; on reduced motion / Save-Data the static gradient remains. */
(function systemBackgroundPlayback(){
  "use strict";
  var video=document.querySelector("#system .studio-system-ambient");
  if(!video)return;
  var motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  var saveData=Boolean(connection && connection.saveData);
  var visible=false;
  var started=false;
  function pause(){ try{video.pause();}catch(e){} }
  function play(){
    if(!visible||document.hidden||motion.matches||saveData){pause();return;}
    if(!started){started=true;video.preload="metadata";}
    video.muted=true;
    var p;
    try{p=video.play();}catch(e){}
    if(p&&typeof p.catch==="function")p.catch(function(){});
  }
  if("IntersectionObserver" in window){
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        visible=entry.isIntersecting && entry.intersectionRatio>=.12;
        if(visible)play();else pause();
      });
    },{rootMargin:"100px 0px 100px 0px",threshold:[0,.12,.25]});
    observer.observe(video);
  }else{
    visible=true;play();
  }
  document.addEventListener("visibilitychange",function(){
    if(document.hidden)pause();else play();
  });
  if(typeof motion.addEventListener==="function")
    motion.addEventListener("change",function(){if(motion.matches)pause();else play();});
})();
