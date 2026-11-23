/* Cross-device hero playback. Keep the poster until the first decoded frame. */
(function () {
  "use strict";
  var wrap=document.getElementById("heroDeviceWrap");
  var screen=wrap&&wrap.querySelector(".hero-phone-screen");
  var video=screen&&screen.querySelector(".hero-video");
  var poster=screen&&screen.querySelector("[data-hero-mobile-poster]");
  var button=screen&&screen.querySelector("[data-hero-mobile-play]");
  if(!wrap||!screen||!video||!poster||!button)return;
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  var saveData=Boolean(connection&&connection.saveData);
  var inView=false,frameReady=false,framePending=false;
  var manualPause=video.dataset.userPaused==="true",watchdog=null;
  function buttonState(label,disabled){
    button.hidden=false;button.disabled=Boolean(disabled);button.setAttribute("aria-label",label||"Reproducir showreel");
    var text=button.querySelector("span");if(text&&label)text.textContent=label;
  }
  function hideButton(){button.hidden=true;button.disabled=false;}
  function clearWatchdog(){if(watchdog!==null){window.clearTimeout(watchdog);watchdog=null;}}
  function revealFrame(){
    if(frameReady||video.videoWidth<=0||video.videoHeight<=0)return;
    frameReady=true;framePending=false;screen.classList.add("is-video-ready");wrap.classList.add("is-video-ready");
    video.dataset.heroFrameReady="true";clearWatchdog();hideButton();
  }
  function showPoster(){
    frameReady=false;framePending=false;screen.classList.remove("is-video-ready");wrap.classList.remove("is-video-ready");
    video.dataset.heroFrameReady="false";
  }
  function confirmFrame(){
    if(frameReady||framePending||video.readyState<2||video.videoWidth<=0||video.videoHeight<=0)return;
    if(typeof video.requestVideoFrameCallback==="function"){
      framePending=true;video.requestVideoFrameCallback(function(){framePending=false;revealFrame();});
    }else{revealFrame();}
  }
  function prepareMuted(){
    video.muted=true;video.defaultMuted=true;video.volume=0;video.setAttribute("muted","");
    video.playsInline=true;video.setAttribute("playsinline","");video.setAttribute("webkit-playsinline","");
    video.preload="auto";video.setAttribute("preload","auto");
  }
  function play(fromGesture){
    if(document.hidden){buttonState("Reproducir showreel",false);return;}
    if(!fromGesture&&(reduced.matches||saveData||manualPause)){buttonState("Reproducir showreel",false);return;}
    if(frameReady&&!video.paused){hideButton();return;}
    prepareMuted();if(fromGesture&&video.error){try{video.load();}catch(error){}}
    buttonState("Cargando showreel…",true);
    var result;try{result=video.play();}catch(error){buttonState("Reintentar reproducción",false);return;}
    if(result&&typeof result.then==="function"){
      result.then(confirmFrame).catch(function(){if(!frameReady)buttonState("Reintentar reproducción",false);});
    }
    clearWatchdog();watchdog=window.setTimeout(function(){
      if(!frameReady&&inView&&!video.error)buttonState("Tocar para reproducir",false);
    },12000);
  }
  function visibilityChanged(visible){
    inView=visible;
    if(!visible){
      clearWatchdog();if(!video.paused){try{video.pause();}catch(error){}}
      showPoster();return;
    }
    if(manualPause||reduced.matches||saveData){buttonState("Reproducir showreel",false);return;}
    if(video.paused||!frameReady)play(false);
  }
  button.addEventListener("click",function(event){
    event.preventDefault();event.stopPropagation();manualPause=false;video.dataset.userPaused="false";play(true);
  });
  video.addEventListener("loadeddata",confirmFrame);video.addEventListener("canplay",confirmFrame);
  video.addEventListener("playing",confirmFrame);video.addEventListener("timeupdate",confirmFrame);
  video.addEventListener("play",function(){if(video.dataset.userPaused!=="true")manualPause=false;});
  video.addEventListener("pause",function(){
    if(!document.hidden&&video.dataset.userPaused==="true"){manualPause=true;buttonState("Reanudar showreel",false);}
    else if(!document.hidden&&inView&&!frameReady){buttonState("Reintentar reproducción",false);}
  });
  ["error","abort","stalled"].forEach(function(name){
    video.addEventListener(name,function(){
      if(name==="error"||video.error){clearWatchdog();showPoster();buttonState("Reintentar reproducción",false);}
      else if(!frameReady){buttonState("Tocar para reproducir",false);}
    });
  });
  video.addEventListener("ended",function(){showPoster();buttonState("Volver a reproducir",false);});
  document.addEventListener("visibilitychange",function(){
    if(document.hidden){if(!video.paused)video.pause();showPoster();buttonState("Reproducir showreel",false);}
    else if(inView&&!manualPause&&!reduced.matches&&!saveData&&(video.paused||!frameReady)){play(false);}
  });
  function motionChanged(){
    if(reduced.matches){if(!video.paused)video.pause();showPoster();buttonState("Reproducir showreel",false);}
    else if(inView&&!manualPause&&!saveData){play(false);}
  }
  if(typeof reduced.addEventListener==="function")reduced.addEventListener("change",motionChanged);
  else if(typeof reduced.addListener==="function")reduced.addListener(motionChanged);
  window.addEventListener("pageshow",function(){
    if(inView&&!document.hidden&&!manualPause&&!reduced.matches&&!saveData&&(video.paused||!frameReady))play(false);
    else if(frameReady&&!video.paused)hideButton();
  });
  if("IntersectionObserver" in window){
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){visibilityChanged(entry.isIntersecting&&entry.intersectionRatio>=.08);});
    },{rootMargin:"160px 0px 160px 0px",threshold:[0,.08,.25]});
    observer.observe(screen);
  }else{
    function measure(){var rect=screen.getBoundingClientRect();visibilityChanged(rect.bottom>0&&rect.top<window.innerHeight);}
    measure();window.addEventListener("scroll",measure,{passive:true});window.addEventListener("resize",measure,{passive:true});
  }
  if(reduced.matches||saveData)buttonState("Reproducir showreel",false);
})();
