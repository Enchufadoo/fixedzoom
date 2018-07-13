let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let zoomLevelInput = document.querySelector("#zoomLevel");
let domainNameInput = document.querySelector("#domainName");
let addNewRuleBtn = document.querySelector("#addNewRule");
let sitesListDiv = document.querySelector("#sitesList");
let sitesListContainer = document.querySelector("#sitesListContainer");

let sites = [];
const ZOOM_BTN_STEP = 5;
 /**
  * Adds more zoom with the buttons
  * @param {*} event 
  */
 function moreZoom(event) {
     event.preventDefault();
     let value = zoomLevelInput.value = parseInt(zoomLevelInput.value);
     if (value % 5) value -= value % 5;
     zoomLevelInput.value = value + ZOOM_BTN_STEP;
     updateUiFromForm();
 }
 /**
  * Substracts zoom with the buttons
  * @param {*} event 
  */
 function lessZoom(event) {
     event.preventDefault();
     let value = zoomLevelInput.value = parseInt(zoomLevelInput.value);
     if (value % 5) value -= value % 5 - ZOOM_BTN_STEP;
     zoomLevelInput.value = value - ZOOM_BTN_STEP;
     updateUiFromForm();
}

/**
 * UPdates the form controls
 * @param {boolean} status 
 */
const updateUiFromForm = function (status) {
    document.querySelector("#zoomLevelLbl").innerHTML = zoomLevelInput.value + "%"
    
}

/**
 * Starting values for the form
 */
const resetForm = function(){
    zoomLevelInput.value = 100;
    domainNameInput.value = '';
}

/**
 * Loads saved and default settings in the options panel
 */
function loadSavedSettings() {
    function setCurrentChoice(result) {
        if(!result.sites){
            browser.storage.local.set({
                sites: sites
            });
        }else{
            sites = result.sites;
        }
        makeSitesList();
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError);
}

/**
 * Adds a new rule for a specific site on button click inside the settings
 * @param {*} event 
 */
const addNewRule = function(event){
    let domain = domainNameInput.value;
    let zoom = zoomLevelInput.value;
    sites.push({domain: domain, zoom: zoom});
    saveSites().then(function(){
        resetForm();
    });
}

/**
 * Saves the sites to the configuration of the extension
 */
const saveSites = function(){
    return browser.storage.local.set({
        sites: sites
    }).then(function () {        
        browser.runtime.sendMessage({
            method: "settingsSaved",
        });
        makeSitesList();
    });
}

const makeSitesList = function(){
    sitesListDiv.innerHTML = "";
    if(sites.length > 0){
        sitesListContainer.className = "longSep";
    }else{
        sitesListContainer.className = "hide longSep";
    }
    for(let i in sites){
        
        let siteDiv = document.createElement('div');
        siteDiv.className = "savedSite"
        
        let domainDiv = document.createElement('div');
        domainDiv.className = "flexOne";
        let domainText = document.createTextNode(sites[i].domain);
        domainDiv.appendChild(domainText);
        
        let zoomDiv = document.createElement('div');
        zoomDiv.className = "flexZero";
        let zoomText = document.createTextNode(sites[i].zoom + "%");
        zoomDiv.appendChild(zoomText);

        let removeIconDiv = document.createElement('div');
        removeIconDiv.className = 'flexZero removeIconDiv';
        let removeIcon = document.createElement('img');
        removeIcon.className = "removeIcon";
        removeIcon.src = '../icons/remove.svg';
        removeIcon.title = 'Remove current rule';
        removeIconDiv.appendChild(removeIcon);
        
        removeIcon.onclick = function(id = i){
            sites.splice(i, 1);
            saveSites();
        }

        siteDiv.appendChild(domainDiv);
        siteDiv.appendChild(zoomDiv);
        siteDiv.appendChild(removeIconDiv);
        
        sitesListDiv.appendChild(siteDiv);
    }    
}

const domainChangeListener = function(){
    
}

document.addEventListener("DOMContentLoaded", resetForm);
document.addEventListener("DOMContentLoaded", loadSavedSettings);
zoomLevelInput.addEventListener('change', updateUiFromForm);
zoomLevelInput.addEventListener('input', updateUiFromForm);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
addNewRuleBtn.addEventListener("click", addNewRule);
domainNameInput.addEventListener('change', domainChangeListener);