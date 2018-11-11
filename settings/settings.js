let allowRegexpCb = document.querySelector("#allowRegexpCb");
let allowAutoRuleCb = document.querySelector("#allowAutoRuleCb");
let allowShortcutCb = document.querySelector("#allowShortcutCb");

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
function loadSavedSettings(){
  function setCurrentChoice(result){
    allowRegexpCb.checked = !!result.allowRegexp;
    allowAutoRuleCb.checked = !!result.allowAutoRule;
    allowShortcutCb.checked = !!result.allowKeyboardShortcut;
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
    value: this.checked
  });
}

/**
 * Save in settings wheter or not to create automatic rules when theres
 * a zoom change 
 */
const saveAutoRule = function() {  
  browser.runtime.sendMessage({
    method: "setAllowAutoRule",
    value: this.checked
  });
}

/**
 * Save allowing a keyboard shortcut to change the extensions zoom
 */
const saveAllowShortcut = function() {  
 browser.runtime.sendMessage({
   method: "saveAllowShortcut",
   value: this.checked
 });
}


allowRegexpCb.addEventListener('change', saveRegexp);
allowAutoRuleCb.addEventListener('change', saveAutoRule);
allowShortcutCb.addEventListener('change', saveAllowShortcut);
