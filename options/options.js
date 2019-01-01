const ZOOM_BTN_STEP = 5;
const WAIT_SLIDER_SAVE_OPTIONS = 900;
let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
let zoomLevelLbl = document.querySelector("#zoomLevelLbl");
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let manageBtn = document.querySelector("#manageBtn");
let restoreBtn = document.querySelector("#restoreBtn");
let disabledSector = document.querySelector("#disabledSector");
let currentUrlDiv = document.querySelector("#currentUrl");
let currentSiteSector = document.querySelector("#currentSiteSector");
let profileSelect = document.querySelector("#profileSelect");
let profileSelectArea = document.querySelector("#profileSelectArea");
let deleteProfileBtn = document.querySelector("#deleteProfile");
let sliderTimer = false;
let settings = false;


/**
 * Enable or disable the zoom input and change the zoom percentage
 * @param {boolean} status 
 */
const updateUi = function () {

  let enabled = !!settings.enabled;
  let zoomLevel = settings.profiles[settings.profile].zoomLevel || 100;
  let allowProfiles = !!settings.allowProfiles;
  zoomLevelBtn.value = zoomLevel;
  enabledCb.checked = enabled;
  zoomLevelLbl.innerHTML = zoomLevel + "%";

  let zoomSector = document.querySelector("div.zoomSector");
  if (enabled) {
    zoomSector.classList.remove('disabled-option');
    disabledSector.classList.add('disabled-option');
  } else {
    zoomSector.classList.add('disabled-option');
    disabledSector.classList.remove('disabled-option');
  }

  profileSelectArea.style.display = allowProfiles ? "block" : "none";
  if (allowProfiles && settings.profiles && settings.profiles.length > 0) {
    addProfilesSelect(settings.profiles, settings.profile);
  }

  deleteProfileBtn.style.visibility = settings.profile > 0 ? "visible" : "hidden";

  loadCurrentUrl();
};

/**
 * Store then zoom and update the ui
 */
function saveZoom() {
  let zoomLevel = zoomLevelBtn.value;
  return browser.runtime.sendMessage({
    method: "setZoomLevel",
    value: zoomLevel
  }).then(function () {
    settings.profiles[settings.profile].zoomLevel = zoomLevel;
    updateUi();
  });
}

/**
 * Store wheter the extension is enabled or not
 */
function saveEnabled() {
  let enabled = !!enabledCb.checked;
  browser.runtime.sendMessage({
    method: "setEnabledStatus",
    value: enabled
  }).then(function () {
    restoreSettings().then(updateUi);
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

    let url = new window.URL(currentUrl);
    let validProtocol = url.protocol != 'moz-extension:';
    let currentHostname = (url).hostname.replace(/^www\./, '');

    if (currentHostname && validProtocol) {
      currentUrlDiv.innerHTML = currentHostname;
      currentSiteSector.style.display = "block";
    } else {
      currentSiteSector.style.display = "none";
    }
  });
};

/**
 * Loads saved and default settings in the options panel
 */
function restoreSettings() {
  return browser.runtime.sendMessage({
    method: "getAllSettings",
  }).then(
    result => {
      settings = result;
    },
    error => {
      console.log(`Error: ${error}`);
    });
}

/**
 * Add the saved profiles to the select
 * @param {array} profiles 
 * @param {any} selectedProfile 
 */
function addProfilesSelect(profiles, selectedProfile) {
  if (profiles) {
    let select = document.getElementById("profileSelect");
    select.options.length = 0;

    let cOption = document.createElement("option");
    cOption.value = "newProfile";
    cOption.text = "+ " + chrome.i18n.getMessage('createProfileOption');
    cOption.id = "newProfileButton";
    select.add(cOption);

    for (let i in profiles) {

      var option = document.createElement("option");
      option.text = profiles[i].name;
      option.value = i;
      select.add(option, i);
      if (i == selectedProfile) {
        select.value = i;
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
  saveZoom();
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
  saveZoom();
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
function sliderChangeHandler() {
  if (sliderTimer) window.clearTimeout(sliderTimer);
  zoomLevelLbl.innerHTML = settings.profiles[settings.profile].zoomLevel + "%";

  sliderTimer = window.setTimeout(function () {
    saveZoom();
  }, WAIT_SLIDER_SAVE_OPTIONS);
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
  let value = this.value;
  switch (value) {
    case 'newProfile':
      window.location = "../profiles/profiles.html";
      break;
    default:
      browser.runtime.sendMessage({
        method: "changeProfile",
        value: parseInt(value)
      }).then(function () {
        restoreSettings().then(updateUi);
      });
  }
}

/**
 * Deletes the selected profile and fallsback to the default one
 * @param {*} event 
 */
function deleteCurrentProfile() {
  let a = browser.runtime.sendMessage({
    method: "deleteCurrentProfile",
  });

  a.then(() => {
    restoreSettings().then(updateUi);
  });

}


/**
 * Changes in form updates the ui
 */
enabledCb.addEventListener('change', saveEnabled);
zoomLevelBtn.addEventListener('change', sliderChangeHandler);
zoomLevelBtn.addEventListener('input', sliderChangeHandler);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
manageBtn.addEventListener("click", openSiteManagement);
restoreBtn.addEventListener("click", restoreDefaultZoom);
deleteProfileBtn.addEventListener("click", deleteCurrentProfile);
document.addEventListener("DOMContentLoaded", () => {
  restoreSettings().then(updateUi);
  // switch animation fix
  window.setTimeout(function () {
    document.querySelector(".switchContainer").classList.remove('preload');
  }, 500);
});
profileSelect.addEventListener("change", profileSelected);