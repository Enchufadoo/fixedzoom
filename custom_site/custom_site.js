const ZOOM_BTN_STEP = 5;
const WAIT_SLIDER_SAVE_OPTIONS = 900;
let enabledCb = document.querySelector("#enabled");
let zoomLevelBtn = document.querySelector("#zoomLevel");
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let manageBtn = document.querySelector("#manageBtn");
let restoreBtn = document.querySelector("#restoreBtn");
let zoomSector = document.querySelector("div.zoomSector");

let currentUrlDiv = document.querySelector("#currentUrl");
let currentSiteSector = document.querySelector("#currentSiteSector");
let sliderTimer = false;
let currentSite = false;
let currentUrl = false;
let validProtocol = true;

window.onload = function(){
  // can't think of anything else not to show the switch animation on page load
  setTimeout(function(){
    let switche = document.querySelector(".switchContainer");
    switche.classList.remove('preload');    
  }, 500)    
}

const enableSite = function(){
  currentSite.enabled = enabledCb.checked;
  saveOptions();
}

/**
 * Enable or disable the zoom input and change the zoom percentage
 * @param {boolean} status 
 */
const updateUi = function () {
  
  currentUrlDiv.innerHTML = currentSite.domain;
  if (currentSite.enabled) {
    zoomSector.classList.remove('disabled-option');    
  } else {
    zoomSector.classList.add('disabled-option');    
  }
  document.querySelector("#zoomLevelLbl").innerHTML = currentSite.zoom + "%"
}


/**
 * If the switch is enabled then save the zoom rule, 
 * if not try to delete the zoom rule
 */
function saveOptions() {
  updateUi()
  
  if(currentSite.enabled){
    browser.runtime.sendMessage({
      method: "saveCustomSiteRule",
      site: currentSite
    });
  }else{
    browser.runtime.sendMessage({
      method: "deleteCustomSiteRule",
      site: currentSite
    });
  }  
}

/**
 * Loads the settings for the current url 
 */
function restoreOptions() {
  function setCurrentChoice(result) { 
    browser.runtime.sendMessage({
      method: "getCurrentUrl",
    }).then(function(currentUrl){
      let currentHostname = (new URL(currentUrl)).hostname.replace(/^www\./, '');
      zoomLevelBtn.value = result.zoomLevel || "100";   

      if(result.sites && result.sites.length > 0){
        for(i in result.sites){
          let site = result.sites[i]
          if(site.domain === currentHostname){
            currentSite = site;
            currentSite.enabled =  true;
            enabledCb.checked = true;
            zoomLevelBtn.value = currentSite.zoom;
          }
        }
      }
      
      if(!currentSite){
        currentSite = {
          domain: currentHostname,
          zoom: result.zoomLevel || "100",
          enabled: false
        };
      }   

      updateUi();
    });
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
  currentSite.zoom = zoomLevelBtn.value
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
  currentSite.zoom = zoomLevelBtn.value
  saveOptions();
}


/**
 * When the slider changes, dont change the zoom right away
 * because a lot of this event with a lot of tabs
 * causes too much cpu usage
 * @param {*} event 
 */
function sliderChangeHandler(event){
  currentSite.zoom = zoomLevelBtn.value
  updateUi();
  if(sliderTimer) clearTimeout(sliderTimer);  
  window.setTimeout(function(){
    saveOptions();
  }, WAIT_SLIDER_SAVE_OPTIONS)
}


/**
 * Changes in form updates the ui
 */
enabledCb.addEventListener('change', enableSite);
enabledCb.addEventListener('change', updateUi);

zoomLevelBtn.addEventListener('change', sliderChangeHandler);
zoomLevelBtn.addEventListener('input', sliderChangeHandler);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
document.addEventListener("DOMContentLoaded", restoreOptions);
