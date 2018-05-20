let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");

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
      method: "startFixedZoom",
    });
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
 * Changes in form updates the ui
 */
enabledCb.addEventListener('click', updateUiFromForm);
zoomLevelBtn.addEventListener('change', updateUiFromForm);
zoomLevelBtn.addEventListener('input', updateUiFromForm);


document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);