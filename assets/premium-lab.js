/* LAB 02. Only editorial case videos: defer downloads and play when visible.
   Audio is never enabled automatically. Does not touch the hero or project players. */
(function () {
  "use strict";
  var reels=Array.prototype.slice.call(document.querySelectorAll("video[data-editorial-reel]"));
  if(!reels.length) return;
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  var visible=new WeakMap();
  function pause(video) { try {video.pause();} catch(error) {} }
  function play(video) {
    if(document.hidden||reduced.matches||!visible.get(video)) return;
    if(video.preload==="none") video.preload="metadata";
    video.muted=true;
    var promise; try {promise=video.play();} catch(error) {}
    if(promise && typeof promise.catch==="function") promise.catch(function(){});
  }
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
