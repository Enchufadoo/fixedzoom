let allowRegexpCb = document.querySelector("#allowRegexpCb");
let allowAutoRuleCb = document.querySelector("#allowAutoRuleCb");

window.onload = function(){
  // can't think of anything else not to show the switch animation on page load
  setTimeout(function(){
    let switche = document.querySelectorAll(".switchContainer");
    
    for (i = 0; i < switche.length; ++i) {
      switche[i].classList.remove('preload');    
    }
    
  }, 500)    

  loadSavedSettings();
}


/**
 * Loads saved settings
 */
function loadSavedSettings() {
  function setCurrentChoice(result) {
      if(result.allowRegexp){
        allowRegexpCb.checked = true;
      }else{
        allowRegexpCb.checked = false;
      }

      if(result.allowAutoRule){
        allowAutoRuleCb.checked = true;
      }else{
        allowAutoRuleCb.checked = false;
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
const saveRegexp = function() {  
  browser.runtime.sendMessage({
    method: "setAllowRegexp",
    allowRegexp: allowRegexpCb.checked
  });
}

/**
 * Save in settings wheter or not to create automatic rules when theres
 * a zoom change 
 */
const saveAutoRule = function() {  
  browser.runtime.sendMessage({
    method: "setAllowAutoRule",
    allowAutoRule: allowAutoRuleCb.checked
  });
}

allowRegexpCb.addEventListener('change', saveRegexp);
allowAutoRuleCb.addEventListener('change', saveAutoRule);

