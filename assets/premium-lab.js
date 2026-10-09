/* LAB 02. Only editorial case videos: defer downloads and play when visible.
   Audio is never enabled automatically. Does not touch the hero or project players. */
(function () {
  "use strict";
  var reels=Array.prototype.slice.call(document.querySelectorAll("video[data-editorial-reel]"));
  if(!reels.length) return;
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  var visible=new WeakMap();
  function pause(video) { try {video.pause();} catch(error) {} }
  function play(video,manual) {
    if(!manual && (document.hidden||reduced.matches||!visible.get(video))) return;
    if(video.preload==="none") video.preload="metadata";
    video.muted=true;
    var promise; try {promise=video.play();} catch(error) {}
    if(promise && typeof promise.catch==="function") promise.catch(function(){});
  }
  reels.forEach(function(video) {
    var button=video.parentElement && video.parentElement.querySelector(".editorial-play-control");
    if(!button) return;
    var originalName=video.getAttribute("aria-label")||"pieza";
    function sync() {
      var running=!video.paused && !video.ended;
      var label=button.querySelector(".editorial-play-label");
      var symbol=button.querySelector(".editorial-play-symbol");
      if(label) label.textContent=running?"Pausar":"Reproducir";
      if(symbol) symbol.textContent=running?"Ⅱ":"▶";
      button.setAttribute("aria-pressed",String(running));
      button.setAttribute("aria-label",(running?"Pausar ":"Reproducir ")+originalName);
    }
    button.addEventListener("click",function(){if(video.paused) play(video,true);else pause(video);});
    video.addEventListener("playing",sync);
    video.addEventListener("pause",sync);
    video.addEventListener("ended",sync);
    video.addEventListener("error",sync);
    sync();
  });
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
    reels.forEach(function(video){visible.set(video,true);});
    reels.forEach(play);
  }
  document.addEventListener("visibilitychange",function(){
    reels.forEach(function(video){if(document.hidden) pause(video); else play(video);});
  });
  if(typeof reduced.addEventListener==="function")
    reduced.addEventListener("change",function(){reels.forEach(function(video){if(reduced.matches)pause(video); else play(video);});});
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
