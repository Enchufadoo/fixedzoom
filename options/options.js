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
    }).then(function(){
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
      document.querySelector("#zoomLevel").value = result.zoomLevel || "100";
      document.querySelector("#enabled").checked = result.enabled || false;
    }
  
    function onError(error) {
      console.log(`Error: ${error}`);
    }
  
    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError);
  }
  
  document.addEventListener("DOMContentLoaded", restoreOptions);
  document.querySelector("form").addEventListener("submit", saveOptions);