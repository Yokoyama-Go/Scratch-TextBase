Player = (function() {
  'use strict';

  /* based on b3ba0df */

  var stage;
  var isFullScreen = false; // TODO ko-ify

  var player = document.querySelector('.player');
  if (!player) return {
    loadProject: function() {},
  };

  var controls = document.querySelector('.controls');
  var flag = document.querySelector('.flag');
  var turbo = document.querySelector('.turbo');
  var pause = document.querySelector('.pause');
  var stop = document.querySelector('.stop');
  var fullScreen = document.querySelector('.full-screen');

  var error = document.querySelector('.internal-error');
  var errorBugLink = document.querySelector('#error-bug-link');

  var flagTouchTimeout;
  function flagTouchStart() {
    flagTouchTimeout = setTimeout(function() {
      turboClick();
      flagTouchTimeout = true;
    }, 500);
  }
  function turboClick() {
    stage.isTurbo = !stage.isTurbo;
    flag.title = stage.isTurbo ? 'Turbo mode enabled. Shift+click to disable.' : 'Shift+click to enable turbo mode.';
    turbo.style.display = stage.isTurbo ? 'block' : 'none';
  }
  function flagClick(e) {
    if (window.App.preFlagClick()) return;

    if (!stage) return;
    if (flagTouchTimeout === true) return;
    if (flagTouchTimeout) {
      clearTimeout(flagTouchTimeout);
    }
    if (e.shiftKey) {
      turboClick();
    } else {
      stage.start();
      pause.className = 'pause';
      stage.stopAll();
      stage.triggerGreenFlag();
    }
    stage.focus();
    e.preventDefault();
  }

  function pauseClick(e) {
    if (!stage) return;
    if (stage.isRunning) {
      stage.pause();
      pause.className = 'play';
    } else {
      stage.start();
      pause.className = 'pause';
    }
    stage.focus();
    e.preventDefault();
  }

  function stopClick(e) {
    if (!stage) return;
    stage.start();
    pause.className = 'pause';
    stage.stopAll();
    stage.focus();
    e.preventDefault();
  }

  function fullScreenClick(e) {
    if (e) e.preventDefault();
    if (!stage) return;
    document.documentElement.classList.toggle('fs');
    isFullScreen = !isFullScreen;
    if (!e || !e.shiftKey) {
      if (isFullScreen) {
        var el = document.documentElement;
        if (el.requestFullScreenWithKeys) {
          el.requestFullScreenWithKeys();
        } else if (el.webkitRequestFullScreen) {
          el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        }
      }
    }
    if (!isFullScreen) {
      document.body.style.width =
      document.body.style.height =
      document.body.style.marginLeft =
      document.body.style.marginTop = '';
    }
    App.isFullScreen.assign(document.documentElement.classList.contains('fs'));
    updateFullScreen();
    if (!stage.isRunning) {
      stage.draw();
    }
    stage.focus();
  }

  function exitFullScreen(e) {
    if (isFullScreen && e.keyCode === 27) {
      fullScreenClick(e);
    }
  }

  function updateFullScreen() {
    if (!stage) return;
    if (isFullScreen) {
      window.scrollTo(0, 0);
      var padding = 8;
      var w = window.innerWidth - padding * 2;
      var h = window.innerHeight - padding - controls.offsetHeight;
      w = Math.min(w, h / .75);
      h = w * .75 + controls.offsetHeight;
      document.body.style.width = w + 'px';
      document.body.style.height = h + 'px';
      document.body.style.marginLeft = (window.innerWidth - w) / 2 + 'px';
      document.body.style.marginTop = (window.innerHeight - h - padding) / 2 + 'px';
      stage.setZoom(w / 480);
    } else {
      stage.setZoom(App.smallStage() ? 0.5 : 1);
      if (!stage.isRunning) {
        stage.draw();
      }
    }
  }

  function preventDefault(e) {
    e.preventDefault();
  }

  window.addEventListener('resize', updateFullScreen);

  flag.addEventListener('click', flagClick);
  pause.addEventListener('click', pauseClick);
  stop.addEventListener('click', stopClick);
  fullScreen.addEventListener('click', fullScreenClick);

  document.addEventListener("fullscreenchange", function () {
    if (isFullScreen !== document.fullscreen) fullScreenClick();
  });
  document.addEventListener("mozfullscreenchange", function () {
    if (isFullScreen !== document.mozFullScreen) fullScreenClick();
  });
  document.addEventListener("webkitfullscreenchange", function () {
    if (isFullScreen !== document.webkitIsFullScreen) fullScreenClick();
  });


  function loadProject(request, cb) {
    if (stage) {
      // TODO is this duplicated in app.js?
      stage.stopAll();
      stage.pause();
    }
    while (player.firstChild) player.removeChild(player.lastChild);
    pause.className = 'pause';
    
    request.onload = function(s) {
      var isTurbo = stage ? stage.isTurbo : false;
      window.stage = stage = s;
      stage.start();
      stage.isTurbo = isTurbo;
      updateFullScreen();

      stage.root.addEventListener('keydown', exitFullScreen);

      player.appendChild(stage.root);
      if (cb) {
        cb(stage);
        cb = null;
      }
    };
    request.onerror = function(e) {
      console.error(e.stack);
    };

    // sometimes the project is already loaded!
    if (request.isDone) {
      if (request.isError) {
        console.error(request.result);
        return;
      }
      request.onload(request.result);
    }
  }


  // transition to small stage when window is too small

  var smallStageBtn = document.querySelector('.small-stage');
  smallStageBtn.addEventListener('click', App.smallStage.toggle);

  var MIN_WIDTH = 1000;
  var MIN_HEIGHT = 508;
  var windowTooSmall = windowSize.compute(function(size) {
    return (size.width < MIN_WIDTH || size.height < MIN_HEIGHT);
  });
  windowTooSmall.subscribe(function(tooSmall) {
    if (tooSmall) App.smallStage.assign(true);
    if (tooSmall) {
      smallStageBtn.classList.add('disabled');
    } else {
      smallStageBtn.classList.remove('disabled');
    }
  });


  // careful not to show transition when window first loads

  function cancelTransitions() {
    document.body.classList.add('no-transition');
    doNext(function() {
      document.body.classList.remove('no-transition');

      // if first load, we can now show the app
      wrap.classList.add('visible');
    });
  }
  cancelTransitions();

  App.smallStage.subscribe(function(isSmall) {
    if (!isSmall && windowTooSmall()) {
      App.smallStage.assign(true);
      return;
    }
    if (isSmall) {
      document.body.classList.add('ss');
    } else {
      document.body.classList.remove('ss');
    }
  });


  // scale phosphorus to small stage

  App.smallStage.subscribe(updateFullScreen);
  App.isFullScreen.subscribe(updateFullScreen);


  // careful not to animate player size when coming out of fullscreen!

  App.isFullScreen.subscribe(cancelTransitions);


  // indicate we need to compile

  App.needsPreview.subscribe(function(needsPreview) {
    flag.classList[needsPreview ? 'add' : 'remove']('needs-preview');
  });

  // indicate compiling had an error

  App.hasErrors.subscribe(function(hasErrors) {
    flag.classList[hasErrors ? 'add' : 'remove']('has-errors');
  });



  return {
    loadProject: loadProject,
    flagClick: flagClick,
    pauseClick: pauseClick,
  };

});

