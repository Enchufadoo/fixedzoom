const ZOOM_BTN_STEP = 5;
const WAIT_SLIDER_SAVE_OPTIONS = 900;
let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let zoomSector = document.querySelector("div.zoomSector");
let currentUrlDiv = document.querySelector("#currentUrl");
let sliderTimer = false;
let currentSite = false;

window.onload = function () {
  // can't think of anything else not to show the switch animation on page load
  window.setTimeout(function () {
    let switche = document.querySelector(".switchContainer");
    switche.classList.remove('preload');
  }, 500);
};

const enableSite = function () {
  currentSite.enabled = enabledCb.checked;
  saveOptions();
};

/**
 * Enable or disable the zoom input and change the zoom percentage
 * @param {boolean} status 
 */
const updateUi = function () {

  currentUrlDiv.innerHTML = currentSite.domain;
  if (currentSite.enabled) {
    zoomSector.classList.remove('disabled-option');
  } else {
    zoomSector.classList.add('disabled-option');
  }
  document.querySelector("#zoomLevelLbl").innerHTML = currentSite.zoom + "%";
};

/**
 * If the switch is enabled then save the zoom rule, 
 * if not try to delete the zoom rule
 */
function saveOptions() {
  updateUi();

  if (currentSite.enabled) {
    browser.runtime.sendMessage({
      method: "saveCustomSiteRule",
      site: currentSite
    });
  } else {
    browser.runtime.sendMessage({
      method: "deleteCustomSiteRule",
      site: currentSite
    });
  }
}

/**
 * Loads the settings for the current url 
 */
function restoreOptions() {
  let urlPro = browser.runtime.sendMessage({
    method: "getCurrentUrl",
  });
  let setPro = browser.runtime.sendMessage({
    method: "getAllSettings",
  });

  Promise.all([setPro, urlPro]).then(function (values) {
    let settings = values[0];
    let currentUrl = values[1];

    handleOptions(settings, currentUrl);
  });
}

const handleOptions = function (settings, currentUrl) {
  let sites = settings.profiles[settings.profile].sites;
  let zoomLevel = settings.profiles[settings.profile].zoomLevel;
  let currentHostname = (new window.URL(currentUrl)).hostname.replace(/^www\./, '');
  zoomLevelBtn.value = zoomLevel || "100";

  if (sites && sites.length > 0) {
    for (let i in sites) {
      let site = sites[i];
      if (site.domain === currentHostname) {
        currentSite = site;
        currentSite.enabled = true;
        enabledCb.checked = true;
        currentSite.regexp = false;
        currentSite.partial = false;
        zoomLevelBtn.value = currentSite.zoom;
      }
    }
  }

  if (!currentSite) {
    currentSite = {
      domain: currentHostname,
      zoom: zoomLevel || "100",
      enabled: false
    };
  }

  updateUi();
};

/**
 * Adds more zoom with the buttons
 * @param {*} event 
 */
function moreZoom(event) {
  event.preventDefault();
  let value = zoomLevelBtn.value = parseInt(zoomLevelBtn.value);
  if (value % 5) value -= value % 5;
  zoomLevelBtn.value = value + ZOOM_BTN_STEP;
  currentSite.zoom = zoomLevelBtn.value;
  saveOptions();
}
/**
 * Substracts zoom with the buttons
 * @param {*} event 
 */
function lessZoom(event) {
  event.preventDefault();
  let value = zoomLevelBtn.value = parseInt(zoomLevelBtn.value);
  if (value % 5) value -= value % 5 - ZOOM_BTN_STEP;
  zoomLevelBtn.value = value - ZOOM_BTN_STEP;
  currentSite.zoom = zoomLevelBtn.value;
  saveOptions();
}

/**
 * When the slider changes, dont change the zoom right away
 * because a lot of this event with a lot of tabs
 * causes too much cpu usage
 * @param {*} event 
 */
function sliderChangeHandler() {
  currentSite.zoom = zoomLevelBtn.value;
  updateUi();
  if (sliderTimer) window.clearTimeout(sliderTimer);
  window.setTimeout(function () {
    saveOptions();
  }, WAIT_SLIDER_SAVE_OPTIONS);
}

/**
 * Changes in form updates the ui
 */
enabledCb.addEventListener('change', enableSite);
enabledCb.addEventListener('change', updateUi);
zoomLevelBtn.addEventListener('change', sliderChangeHandler);
zoomLevelBtn.addEventListener('input', sliderChangeHandler);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
document.addEventListener("DOMContentLoaded", restoreOptions);