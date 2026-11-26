/* Decorative system background: muted, lazy and viewport-controlled.
   Reuses an existing source; on reduced motion / Save-Data the static gradient remains. */
(function systemBackgroundPlayback(){
  "use strict";
  var video=document.querySelector("#system .studio-system-ambient");
  if(!video||!video.getAttribute("src"))return;
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
