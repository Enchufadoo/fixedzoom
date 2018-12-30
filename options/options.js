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
let newProfileButton = document.querySelector("#newProfileButton");
let profileSelect = document.querySelector("#profileSelect");
let profileSelectArea = document.querySelector("#profileSelectArea");
let sliderTimer = false;

window.onload = function () {
  // can't think of anything else not to show the switch animation on page load
  setTimeout(function () {
    let switche = document.querySelector(".switchContainer");
    switche.classList.remove('preload');
  }, 500)
}

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

const updateUiFromForm = function () {
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
const loadCurrentUrl = function () {
  browser.runtime.sendMessage({
    method: "getCurrentUrl",
  }).then(function (currentUrl) {

    let url = new URL(currentUrl)
    let validProtocol = url.protocol != 'moz-extension:';
    let currentHostname = (url).hostname.replace(/^www\./, '');

    if (currentHostname && validProtocol) {
      currentUrlDiv.innerHTML = currentHostname
      currentSiteSector.style.display = "block";
    } else {
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
    profileSelectArea.style.display = result.allowProfiles ? "block" : "none"
    addProfilesSelect(result.profiles, result.profile);
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
 * Add the saved profiles to the select
 * @param {array} profiles 
 * @param {any} selectedProfile 
 */
function addProfilesSelect(profiles, selectedProfile) {
  if (profiles) {
    for (let i in profiles) {
      let select = document.getElementById("profileSelect");
      var option = document.createElement("option");
      option.text = profiles[i].name;
      option.value = i;
      select.add(option, i + 1);
      if (i === selectedProfile) {
        option.selected = true;
      }
    }
  }
}

/**
 * Adds more zoom with the buttons
 * @param {*} event 
 */
function moreZoom(event) {
  event.preventDefault();
  let value = zoomLevelBtn.value = parseInt(zoomLevelBtn.value);
  if (value % 5) value -= value % 5;
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
function openSiteManagement(event) {
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
function sliderChangeHandler(event) {
  updateUiFromForm();
  if (sliderTimer) clearTimeout(sliderTimer);
  window.setTimeout(function () {
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
 * When the select changes the value
 * either create or select a profile
 * 
 * @param {*} event 
 */
function profileSelected(event) {
  event.preventDefault();
  event.stopPropagation();

  switch (this.value) {
    case 'newProfile':
      window.location = "../profiles/profiles.html";
      break;
    case 'defaultProfile':
      browser.runtime.sendMessage({
        method: "changeProfile",
        value: false
      });
      break;
    default:
      browser.runtime.sendMessage({
        method: "changeProfile",
        value: this.value
      });
  }
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
profileSelect.addEventListener("change", profileSelected);
document.querySelector("form").addEventListener("submit", saveOptions);