var lc = {
  settings: {
      logLevel: 4, //See log function below. Default: 0
      audioEnabled: true, //Enable for audio as well as video. Default: true
      loopEverything: true, //Automatically loop all videos. Default: false
      startHidden: false
  },

  //Measured in seconds. The keys are video.currentSrc
  startTimes: [], //Default 0
  endTimes: [], //Default end of video
  loopsEnabled: [], //

  mediaElements: [],
  regStrip: /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm
};

/* Log Levels:
  0. None
  1. Errors
  2. Warnings
  3. Info
  4. Debug
*/
function log(message, logLevel = 5) {
  let currentLevel = lc.settings.logLevel;

  if (currentLevel >= logLevel) {
      if (logLevel == 1) {
          console.log("ERROR: " + message);
      } else if (logLevel == 2) {
          console.log("WARNING: " + message);
      } else if (logLevel == 3) {
          console.log("INFO: " + message);
      } else if (logLevel == 4) {
          console.log("DEBUG: " + message);
      } else {
          console.log("UNDEFINED: " + message); 
      }
  }
}

function runAction(action, value, e) {
  if (e) {
      var targetController = e.target.getRootNode().host;
  }

  lc.mediaElements.forEach(function(v) {
      var controller = v.vsl.div;

      if (e && !(targetController == controller)) {
          return;
      }

      //showController(controller);

      if (!v.classList.contains("vsl-cancelled")) {
          if (action === "set-start") {
              log("Setting loop start to: " + v.currentTime, 4);
              setLoop(v, v.currentTime, lc.endTimes[v.currentSrc]);
          } else if (action === "set-end") {
              log("Setting loop end to: " + v.currentTime, 4);
              setLoop(v, lc.startTimes[v.currentSrc], v.currentTime);
          } else if (action === "toggle-loop") {
              toggleLoop(v);
          } else if (action === "drag") {
                handleDrag(v, e);
          }
      }
  });
}

//Mostly from VSC
function defineVideoController() {
  log("Defining video controller", 4);
  lc.videoController = function(target, parent) {
      log("Creating new video controller", 4);
      if (target.vsl) {
          return target.vsl;
      }

      lc.mediaElements.push(target);

      this.video = target;
      this.parent = target.parentElement || parent;
      target.loopStart = 0; //default loop to beginning
      if (lc.settings.loopEverything) {
          log("Loop everything enabled", 3);
          lc.loopsEnabled[target.currentSrc] = true;
      } else {
          lc.loopsEnabled[target.currentSrc] = false;
      }

      lc.startTimes[target.currentSrc] = 0;
      lc.endTimes[target.currentSrc] = target.duration;

      //Default start and end time

      log("Loop time set to default: " + lc.startTimes[target.currentSrc] + " to " + lc.endTimes[target.currentSrc], 3);

      this.div = this.initControls();

      //setLoop(target, 0, target.duration);

      var observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (
                  mutation.type === "attributes" &&
                  (mutation.attributeName === "src" ||
                      mutation.attributeName === "currentSrc")
              ) {
                  log("mutation of A/V element", 4);
                  var controller = this.div;
                  if (!mutation.target.src && !mutation.target.currentSrc) {
                      controller.classList.add("vsl-nosource");
                  } else {
                      controller.classList.remove("vsl-nosource");
                  }
              }
          });
      });
      observer.observe(target, {
          attributeFilter: ["src", "currentSrc"]
      });
  };

  lc.videoController.prototype.remove = function() {
      this.div.remove();
      this.video.removeEventListener("timeupdate", lc.handleLoop);
      delete this.video.vsl;
      let idx = lc.mediaElements.indexOf(this.video);
      if (idx != -1) {
          lc.mediaElements.splice(idx, 1);
      }

      let idy = lc.startTimes.indexOf(this.video.currentSrc);
      if (idy != -1) {
          lc.startTimes.splice(idy, 1);
      }

      let idz = lc.endTimes.indexOf(this.video.currentSrc);
      if (idz != -1) {
          lc.endTimes.splice(idz, 1);
      }

      let ida = lc.loopsEnabled.indexOf(this.video.currentSrc);
      if (ida != -1) {
          lc.loopsEnabled.splice(ida, 1);
      }
  };

  lc.videoController.prototype.initControls = function() {
      log("Initializing controls", 4);
      //console.log(this.video.ownerDocument);
      const document = this.video.ownerDocument;

      var top = Math.max(this.video.offsetTop, 0) + "px",
      left = Math.max(this.video.offsetLeft, 0) + "px";

      var wrapper = document.createElement("div");
      wrapper.classList.add("vsl-controller");

      if (!this.video.src && !this.video.currentSrc) {
        wrapper.classList.add("vsc-nosource");
      }

      if (lc.settings.startHidden) {
          wrapper.classList.add("vsl-hidden");
      }

      var shadow = wrapper.attachShadow({
          mode: "open"
      });
      var shadowTemplate = `
      <style>
          @import "${chrome.runtime.getURL("shadow.css")}";
        </style>
      <div id="controller" style="top:${top}; left:${left}; opacity:0.9">
          <span data-action="drag" class="draggable drag-indicator">ON</span>
          <span id="controls">
              <button class="start-indicator rw" data-action="set-start">0:00</button>
              <span> to </span>
              <button class="end-indicator rw" data-action="set-end">1:00</button>
              <button class="toggle-indicator rw" data-action="toggle-loop">
                ON
              </button>
          </span>
      </div>
      `;

      shadow.innerHTML = shadowTemplate;
      shadow.querySelector(".draggable").addEventListener("mousedown",
          (e) => {
              runAction(e.target.dataset["action"], false, e);
              e.stopPropagation();
          },
          true
      );

      shadow.querySelectorAll("button").forEach(function(button) {
          button.addEventListener("click",
              (e) => {
                  runAction(e.target.dataset["action"], false, e);
                  e.stopPropagation();
              },
              true
          );
      });


      shadow
          .querySelector("#controller")
          .addEventListener("click", (e) => e.stopPropagation(), false);
      shadow
          .querySelector("#controller")
          .addEventListener("mousedown", (e) => e.stopPropagation(), false);

      this.startIndicator = shadow.querySelector(".start-indicator");
      this.endIndicator = shadow.querySelector(".end-indicator");

      this.toggleIndicator = shadow.querySelector(".toggle-indicator");
      this.dragIndicator = shadow.querySelector(".drag-indicator");

      /*this.video.vsl.startIndicator = shadow.querySelector(".start-indicator");
      this.video.vsl.endIndicator = shadow.querySelector(".end-indicator");

      this.video.vsl.toggleIndicator = shadow.querySelector(".toggle-indicator");
      this.video.vsl.dragIndicator = shadow.querySelector(".drag-indicator");*/

      /*if (lc.loopsEnabled[video.currentSrc]) {
        this.toggleIndicator.textContent = "ON";
        this.dragIndicator.textContent = "ON";
      } else {
        this.toggleIndicator.textContent = "OFF";
        this.dragIndicator.textContent = "OFF";
      }*/

      var fragment = document.createDocumentFragment();
      fragment.appendChild(wrapper);

      this.parent.insertBefore(fragment, this.parent.firstChild);

      return wrapper;
  };
}

function initNow(document) {
  log("initNow started", 4);

  function checkForVideo(node, parent, added) {
      // Only proceed with supposed removal if node is missing from DOM
      if (!added && document.body.contains(node)) {
          return;
      }
      if (
          node.nodeName === "VIDEO" ||
          (node.nodeName === "AUDIO" && lc.settings.audioEnabled)
      ) {
          if (added) {
              node.vsl = new lc.videoController(node, parent);
          } else {
              if (node.vsl) {
                  node.vsl.remove();
              }
          }
      } else if (node.children != undefined) {
          for (var i = 0; i < node.children.length; i++) {
              const child = node.children[i];
              checkForVideo(child, child.parentNode || parent, added);
          }
      }
  }

  if (!document.body || document.body.classList.contains("vsl-initialized")) {
      return;
  }

  /*try {

  } catch {

  }*/

  document.body.classList.add("vsl-initialized");
  log("initNow: vsl-initialized added to document body", 4);

  if (document === window.document) {
      defineVideoController();
  } else {
      var link = document.createElement("link");
      link.href = chrome.runtime.getURL("inject.css");
      link.type = "text/css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
  }

  var docs = Array(document);
  try {
      if (inIframe()) {
          docs.push(window.top.document);
      }
  } catch (e) {}

  var observer = new MutationObserver(function(mutations) {
      // Process the DOM nodes lazily
      requestIdleCallback(
          (_) => {
              mutations.forEach(function(mutation) {
                  switch (mutation.type) {
                      case "childList":
                          mutation.addedNodes.forEach(function(node) {
                              if (typeof node === "function") return;
                              checkForVideo(node, node.parentNode || mutation.target, true);
                          });
                          mutation.removedNodes.forEach(function(node) {
                              if (typeof node === "function") return;
                              checkForVideo(node, node.parentNode || mutation.target, false);
                          });
                          break;
                      case "attributes":
                          if (
                              mutation.target.attributes["aria-hidden"] &&
                              mutation.target.attributes["aria-hidden"].value == "false"
                          ) {
                              var flattenedNodes = getShadow(document.body);
                              var node = flattenedNodes.filter(
                                  (x) => x.tagName == "VIDEO"
                              )[0];
                              if (node) {
                                  if (node.vsl)
                                      node.vsl.remove();
                                  checkForVideo(node, node.parentNode || mutation.target, true);
                              }
                          }
                          break;
                  }
              });
          }, {
              timeout: 1000
          }
      );
  });
  observer.observe(document, {
      attributeFilter: ["aria-hidden"],
      childList: true,
      subtree: true
  });

  var mediaTags;
  if (lc.settings.audioEnabled) {
      mediaTags = document.querySelectorAll("video, audio");
  } else {
      mediaTags = document.querySelectorAll("video");
  }

  mediaTags.forEach(function(video) {
      video.vsl = new lc.videoController(video);
  });

  //Loop through iframes and initialize as well
  var frameTags = document.getElementByTagName("iframe");
  Array.prototype.forEach.call(frameTags, function(frame) {
      // Ignore frames we don't have permission to access (different origin).
      try {
          var childDocument = frame.contentDocument;
      } catch (e) {
          return;
      }
      initWhenReady(childDocument);
  });

}

//The function to be run. Initializes everything
function initWhenReady(document) {
  log("Started initWhenReady", 4);
  /*if (isBlacklisted()) {
    return;
  }*/

  window.addEventListener('load', () => {
      initNow(window.document);
  });

  if (document) {
      if (document.readyState === "complete") {
          initNow(document);
      } else {
          document.onreadystatechange = () => {
              if (document.readyState === "complete") {
                  initNow(document);
              }
          };
      }
  }
  log("initWhenReady completed", 4);
}

function toggleLoop(video) {
  let enabled = lc.loopsEnabled[video.currentSrc];
  log("Video is currently " + enabled + ", toggling", 3);

  if (enabled) {
      lc.loopsEnabled[video.currentSrc] = false;
      video.vsl.toggleIndicator.textContent = "OFF";
      video.vsl.dragIndicator.textContent = "OFF";
  } else {
      lc.loopsEnabled[video.currentSrc] = true;
      video.vsl.toggleIndicator.textContent = "ON";
      video.vsl.dragIndicator.textContent = "ON";
  }
}

//Function will be binded to video when called so this.handleLoop can be used for removeEventListener
function setLoop(video, loopStart, loopEnd) {
    loopStart = Math.floor(loopStart);
    loopEnd = Math.floor(loopEnd);

    log("Setting loop from " + loopStart + " to " + loopEnd + " for " + video.currentSrc, 4);
    lc.startTimes[video.currentSrc] = loopStart;
    lc.endTimes[video.currentSrc] = loopEnd;

    var startIndicator = video.vsl.startIndicator;
  var endIndicator = video.vsl.endIndicator;

  log("Start set to " + loopStart + " and end set to " + loopEnd, 3);
  startIndicator.textContent = loopStart;
  endIndicator.textContent = loopEnd;

  //If listener already exists, it overrides it
  video.addEventListener("timeupdate", (lc.handleLoop = checkTime.bind(video)));

  video.start();
  video.play();
}

//Is its own separate function so it can be used with removeEventListener() later
function checkTime() {
    let video = this;
  if (lc.loopsEnabled[video.currentSrc]) {
      if (video.currentTime >= lc.endTimes[video.currentSrc]) {
          video.currentTime = lc.startTimes[video.currentSrc];
      }
      /*video.load();
        video.play();*/
  }
}


//Helper functions

//Taken almost directly from VSC
function handleDrag(video, e) {
  const controller = video.vsl.div;
  const shadowController = controller.shadowRoot.querySelector("#controller");

  // Find nearest parent of same size as video parent.
  var parentElement = controller.parentElement;
  while (
      parentElement.parentNode &&
      parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
      parentElement.parentNode.offsetWidth === parentElement.offsetWidth
  ) {
      parentElement = parentElement.parentNode;
  }

  video.classList.add("vsl-dragging");
  shadowController.classList.add("dragging");

  const initialMouseXY = [e.clientX, e.clientY];
  const initialControllerXY = [
      parseInt(shadowController.style.left),
      parseInt(shadowController.style.top)
  ];

  const startDragging = (e) => {
      let style = shadowController.style;
      let dx = e.clientX - initialMouseXY[0];
      let dy = e.clientY - initialMouseXY[1];
      style.left = initialControllerXY[0] + dx + "px";
      style.top = initialControllerXY[1] + dy + "px";
  };

  const stopDragging = () => {
      parentElement.removeEventListener("mousemove", startDragging);
      parentElement.removeEventListener("mouseup", stopDragging);
      parentElement.removeEventListener("mouseleave", stopDragging);

      shadowController.classList.remove("dragging");
      video.classList.remove("vsl-dragging");
  };

  parentElement.addEventListener("mouseup", stopDragging);
  parentElement.addEventListener("mouseleave", stopDragging);
  parentElement.addEventListener("mousemove", startDragging);
}

function isBlacklisted() {
  blacklisted = false;
  lc.settings.blacklist.split("\n").forEach((match) => {
      match = match.replace(lc.regStrip, "");
      if (match.length == 0) {
          return;
      }

      if (match.startsWith("/")) {
          try {
              var regexp = new RegExp(match);
          } catch (err) {
              return;
          }
      } else {
          var regexp = new RegExp(escapeStringRegExp(match));
      }

      if (regexp.test(location.href)) {
          blacklisted = true;
          return;
      }
  });
  return blacklisted;
}

function inIframe() {
  try {
      return window.self !== window.top;
  } catch (e) {
      return true;
  }
}

function getShadow(parent) {
  let result = [];

  function getChild(parent) {
      if (parent.firstElementChild) {
          var child = parent.firstElementChild;
          do {
              result.push(child);
              getChild(child);
              if (child.shadowRoot) {
                  result.push(getShadow(child.shadowRoot));
              }

              child = child.nextElementSibling;
          } while (child);
      }
  }

  getChild(parent);
  return result.flat(Infinity);
}

//Actually start now

initWhenReady(document);