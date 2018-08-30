const ZOOM_BTN_STEP = 5;
const WAIT_SLIDER_SAVE_OPTIONS = 900;
let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let manageBtn = document.querySelector("#manageBtn");
let restoreBtn = document.querySelector("#restoreBtn");
let disabledSector = document.querySelector("#disabledSector");
let currentUrlDiv = document.querySelector("#currentUrl");
let currentSiteSector = document.querySelector("#currentSiteSector");
let sliderTimer = false;



/**
 * Enable or disable the zoom input and change the zoom percentage
 * @param {boolean} status 
 */
const updateUi = function (status) {
  let zoomSector = document.querySelector("div.zoomSector");
  if (status) {
    zoomSector.classList.remove('disabled-option');
    disabledSector.classList.add('disabled-option');
  } else {
    zoomSector.classList.add('disabled-option');
    disabledSector.classList.remove('disabled-option');
  }
  document.querySelector("#zoomLevelLbl").innerHTML = zoomLevelBtn.value + "%"
}

const updateUiFromForm = function(){
  let status = enabledCb.checked;
  updateUi(status);
}

/**
 * Saves everything in the local storage
 * and reloads 
 */
function saveOptions() {
  browser.storage.local.set({
    enabled: document.querySelector("#enabled").checked,
    zoomLevel: document.querySelector("#zoomLevel").value
  }).then(function () {
    browser.runtime.sendMessage({
      method: "settingsSaved",
    });
    updateUiFromForm();
  });
}

/**
 * Queries for the current url and its a valid one
 * displays it 
 */
const loadCurrentUrl = function(){
  browser.runtime.sendMessage({
    method: "getCurrentUrl",
  }).then(function(currentUrl){

    let url =  new URL(currentUrl)
    let validProtocol = url.protocol != 'moz-extension:';
    let currentHostname = (url).hostname.replace(/^www\./, '');

    if(currentHostname && validProtocol){
      currentUrlDiv.innerHTML = currentHostname
      currentSiteSector.style.display = "block";
    }else{
      currentSiteSector.style.display = "none";
    }
  });
}

/**
 * Loads saved and default settings in the options panel
 */
function restoreOptions() {
  
  function setCurrentChoice(result) {
    let status = result.enabled || false;
    document.querySelector("#zoomLevel").value = result.zoomLevel || "100";
    document.querySelector("#enabled").checked = status;
    updateUi(status);
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  var getting = browser.storage.local.get();
  getting.then(setCurrentChoice, onError);
  loadCurrentUrl();

}


/**
 * Adds more zoom with the buttons
 * @param {*} event 
 */
function moreZoom(event){
  event.preventDefault();
  let value = zoomLevelBtn.value = parseInt(zoomLevelBtn.value);
  if(value % 5) value -= value % 5;
  zoomLevelBtn.value = value + ZOOM_BTN_STEP;
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
  
  saveOptions();
}
/**
 * Opens the administration of per site zoom rules
 * @param {*} event 
 */
function openSiteManagement(event){
  event.preventDefault();
  browser.runtime.sendMessage({
    method: "openSiteRulesManagement",
  });
}

/**
 * When the slider changes, dont change the zoom right away
 * because a lot of this event with a lot of tabs
 * causes too much cpu usage
 * @param {*} event 
 */
function sliderChangeHandler(event){
  updateUiFromForm();
  if(sliderTimer) clearTimeout(sliderTimer);  
  window.setTimeout(function(){
    saveOptions();
  }, WAIT_SLIDER_SAVE_OPTIONS)
}

/**
 * Restores the browser zoom to 100%
 * @param {*} event 
 */
function restoreDefaultZoom(event) {
  event.preventDefault();
  browser.runtime.sendMessage({
    method: "restoreDefaultZoom",
  });
}

/**
 * Changes in form updates the ui
 */
enabledCb.addEventListener('change', saveOptions);
zoomLevelBtn.addEventListener('change', sliderChangeHandler);
zoomLevelBtn.addEventListener('input', sliderChangeHandler);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
manageBtn.addEventListener("click", openSiteManagement);
restoreBtn.addEventListener("click", restoreDefaultZoom);

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);