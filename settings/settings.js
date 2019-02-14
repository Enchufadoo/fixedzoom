let allowRegexpCb = document.querySelector("#allowRegexpCb");
let allowAutoRuleCb = document.querySelector("#allowAutoRuleCb");
let allowProfilesCb = document.querySelector("#allowProfilesCb");
let blackIconCb = document.querySelector("#blackIcon");
let whiteIconCb = document.querySelector("#whiteIcon");
let colorCb = document.querySelectorAll(".iconColor");

const COLOR_BLACK = 'black';
const COLOR_WHITE = 'white';

window.onload = function () {
  // can't think of anything else not to show the switch animation on page load
  window.setTimeout(function () {
    let switche = document.querySelectorAll(".switchContainer");

    for (let i = 0; i < switche.length; ++i) {
      switche[i].classList.remove('preload');
    }
  }, 500);

  loadSavedSettings();
};

/**
 * Loads saved settings
 */
function loadSavedSettings() {
  function setCurrentChoice(result) {
    allowRegexpCb.checked = !!result.allowRegexp;
    allowAutoRuleCb.checked = !!result.allowAutoRule;
    allowProfilesCb.checked = !!result.allowProfiles;

    if (typeof result.iconColor === 'undefined' || !result.iconColor || result.iconColor === COLOR_BLACK) {
      blackIconCb.checked = true;
    } else {
      whiteIconCb.checked = true;
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
const saveRegexp = function () {
  browser.runtime.sendMessage({
    method: "setAllowRegexp",
    value: this.checked
  });
};

/**
 * Save in settings wheter or not to create automatic rules when theres
 * a zoom change 
 */
const saveAutoRule = function () {
  browser.runtime.sendMessage({
    method: "setAllowAutoRule",
    value: this.checked
  });
};

/**
 * Change one of the two icons available
 */
const saveIconColor = function () {
  browser.runtime.sendMessage({
    method: "setIconColor",
    value: blackIconCb.checked ? COLOR_BLACK : COLOR_WHITE
  });
};

/**
 * Allow or not multiple profiles 
 */
const saveAllowProfiles = function () {

  browser.runtime.sendMessage({
    method: "setAllowProfiles",
    value: this.checked
  });
};

allowRegexpCb.addEventListener('change', saveRegexp);
allowAutoRuleCb.addEventListener('change', saveAutoRule);
allowProfilesCb.addEventListener('change', saveAllowProfiles);
Array.from(colorCb).forEach(function (element) {
  element.addEventListener('change', saveIconColor);
});