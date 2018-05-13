let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
/**
 * Enable or disable the zoom input based on enabled status
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


/**
 * Saves everything in the local storage
 * and reloads t
 * @param {*} e 
 */
function saveOptions(e) {
  console.log("llegue a save options");
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
 * Enabled checkbox changes updates the ui
 */
enabledCb.addEventListener('click', function (event) {

  let status = enabledCb.checked;
  updateUi(status);
});

/**
 * Range input change event updates the ui
 */
zoomLevelBtn.addEventListener('change', function (event) {
  let status = enabledCb.checked;
  updateUi(status);
});


document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);