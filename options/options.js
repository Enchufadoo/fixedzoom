const ZOOM_BTN_STEP = 5;
let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let manageBtn = document.querySelector("#manageBtn");
let disabledSector = document.querySelector("#disabledSector");

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
 * Changes in form updates the ui
 */
enabledCb.addEventListener('change', saveOptions);
zoomLevelBtn.addEventListener('change', saveOptions);
zoomLevelBtn.addEventListener('input', saveOptions);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
manageBtn.addEventListener("click", openSiteManagement);

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);