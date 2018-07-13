const ZOOM_BTN_STEP = 5;
let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let manageBtn = document.querySelector("#manageBtn");

/**
 * Enable or disable the zoom input and change the zoom percentage
 * @param {boolean} status 
 */
const updateUi = function (status) {
  let zoomSector = document.querySelector("div.zoomSector");
  if (status) {
    zoomSector.classList.remove('disabled-option');
  } else {
    zoomSector.classList.add('disabled-option');
  }
  document.querySelector("#zoomLevelLbl").innerHTML = zoomLevelBtn.value + "%"
}

const updateUiFromForm = function(){
  let status = enabledCb.checked;
  updateUi(status);
}

/**
 * Saves everything in the local storage
 * and reloads t
 * @param {*} e 
 */
function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    enabled: document.querySelector("#enabled").checked,
    zoomLevel: document.querySelector("#zoomLevel").value
  }).then(function () {
    browser.runtime.sendMessage({
      method: "settingsSaved",
    });
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
  updateUiFromForm();
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
  updateUiFromForm();
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
enabledCb.addEventListener('click', updateUiFromForm);
zoomLevelBtn.addEventListener('change', updateUiFromForm);
zoomLevelBtn.addEventListener('input', updateUiFromForm);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
manageBtn.addEventListener("click", openSiteManagement);

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);