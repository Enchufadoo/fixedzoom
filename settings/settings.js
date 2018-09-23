let enabledCb = document.querySelector("#enabled");

window.onload = function(){
  // can't think of anything else not to show the switch animation on page load
  setTimeout(function(){
    let switche = document.querySelector(".switchContainer");
    switche.classList.remove('preload');    
  }, 500)    

  loadSavedSettings();
}


/**
 * Loads saved settings
 */
function loadSavedSettings() {
  function setCurrentChoice(result) {
      if(result.allowRegexp){
        enabledCb.checked = true;
      }else{
        enabledCb.checked = false;
      }
  }

  function onError(error) {
      console.log(`Error: ${error}`);
  }
  
  var getting = browser.storage.local.get();
  getting.then(setCurrentChoice, onError);
}


/**
 * Save in settings wheter or not to allow regular expressions
 */
function saveOptions() {  
  browser.runtime.sendMessage({
    method: "setAllowRegexp",
    allowRegexp: enabledCb.checked
  });
}

enabledCb.addEventListener('change', saveOptions);

