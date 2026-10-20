/* Optional previews become visible only after their local MP4 file loads. */
document.querySelectorAll('[data-sample-video]').forEach(function(video) {
  var stage = video.closest('.independent-sample-stage');
  if (!stage) return;
  video.addEventListener('loadedmetadata', function() {
    stage.classList.add('has-video');
  });
  video.addEventListener('error', function() {
    stage.classList.remove('has-video');
  });
  if (video.readyState >= 1) stage.classList.add('has-video');
});