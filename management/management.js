let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let partialRuleBtn = document.querySelector("#partialRuleButton");
let zoomLevelInput = document.querySelector("#zoomLevel");
let domainNameInput = document.querySelector("#domainName");
let addNewRuleBtn = document.querySelector("#addNewRule");
let sitesListDiv = document.querySelector("#sitesList");
let sitesListContainer = document.querySelector("#sitesListContainer");

let validUrl = false;

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
    validateDomainInput();
    updateUiFromForm();
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
 * partial means search for a string inside the url and not check the domain
 * useful for matching moz-extension and other weird urls
 * @param {*} event 
 */
const addNewRule = function(event){
    let domain = domainNameInput.value.trim();
    let zoom = zoomLevelInput.value;
    let partial = false;
    if(domain.indexOf("#") === 0){
        partial = true;
        domain = domain.substr(1)
    }else{
        domain = domain.replace('https://', '').replace('http://', '');
        domain = domain.replace(/^www\./, '');
        domain = trimSpecial(domain, '/');
    }
    
    browser.runtime.sendMessage({
        method: "saveCustomSiteRule",
        site: {domain: domain, zoom: zoom, partial: partial}
    }).then(function(){
        loadSavedSettings();
        resetForm();
    });
}

/**
 * Borrowed from https://stackoverflow.com/a/36391166
 * 
 * @param {*} s 
 * @param {*} mask 
 */
function trimSpecial(s, mask) {
    while (~mask.indexOf(s[0])) {
        s = s.slice(1);
    }
    while (~mask.indexOf(s[s.length - 1])) {
        s = s.slice(0, -1);
    }
    return s;
}


/**
 * Saves the sites to the configuration of the extension
 */
const saveSites = function(){
    makeSitesList();
    browser.runtime.sendMessage({
        method: "settingsSaved",
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
        siteDiv.className = "savedSite";
        
        let domainDiv = document.createElement('div');
        domainDiv.className = "flexOne";
        let domainText = document.createTextNode(sites[i].domain);
        domainDiv.appendChild(domainText); 
        
        if(sites[i].partial){
            let partialSpan = document.createElement('span');
            partialSpan.className = "partialDomain";
            let partialText = document.createTextNode(' (Partial Search)');
            partialSpan.appendChild(partialText);
            domainDiv.appendChild(partialSpan)
        }
        
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
            let site = sites[i]
            browser.runtime.sendMessage({
                method: "deleteCustomSiteRule",
                site: site
            }).then(function(){
                loadSavedSettings();
            });
            
        }

        siteDiv.appendChild(domainDiv);
        siteDiv.appendChild(zoomDiv);
        siteDiv.appendChild(removeIconDiv);
        
        sitesListDiv.appendChild(siteDiv);
    }    
}

/**
 * So so valid domain checker
 */
const validDomainChecker = function(str){    
    let res = str.match(/^(http:\/\/|https:\/\/)?.+\.[a-zA-Z0-9]+([\/])?$/g);
    return res !== null
}

/**
 * Validate domain when theres a change in the input
 */
const validateDomainInput = function(){
    function disableInput(){
        addNewRuleBtn.classList.add('disabledOption');
    }
    function enableInput() {
        addNewRuleBtn.classList.remove('disabledOption');
    }
    function markErrorInput(){
        domainNameInput.classList.add("errorInput");
    }
    function removeErrorInput() {
        domainNameInput.classList.remove("errorInput");
    }
    function markValidInput() {
        domainNameInput.classList.add("validInput");
    }
    function removeValidInput() {
        domainNameInput.classList.remove("validInput");
    }

    let val = domainNameInput.value.trim();    

    // if the first character is a # do a string search and not domain search
    if(val.trim().indexOf("#") === 0){
        if(val.length < 2){
            disableInput();
            removeValidInput();
            removeErrorInput();
        }else{
            removeErrorInput();
            markValidInput();
            enableInput();
        }        
    }

    else if(val.length < 4){
        disableInput();
        removeErrorInput();
        removeValidInput();
    }

    else if(!validDomainChecker(val)){
        disableInput();
        removeValidInput();
        markErrorInput();
    }

    else{
        enableInput();
        removeErrorInput();
        markValidInput();
    }
    /** first and last extension I do without a framework */
}

const showPartialInstructions = function(event){
    event.preventDefault();
    let instructionsDiv = document.querySelector("#partialRuleDescription");
    //getComputedStyle(instructionsDiv, 'display') === 'block' ? 'none' : 'block';
    instructionsDiv.style.display = instructionsDiv.style.display === '' ? 'block' : '' ;  
    
}

domainNameInput.addEventListener('change', validateDomainInput);
domainNameInput.addEventListener('input', validateDomainInput);
document.addEventListener("DOMContentLoaded", resetForm);
document.addEventListener("DOMContentLoaded", loadSavedSettings);
zoomLevelInput.addEventListener('change', updateUiFromForm);
zoomLevelInput.addEventListener('input', updateUiFromForm);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
addNewRuleBtn.addEventListener("click", addNewRule);
partialRuleBtn.addEventListener("click", showPartialInstructions);