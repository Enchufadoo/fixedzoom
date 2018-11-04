// Constants ---------------
const ACTIONS = {
    SET_ZOOM_LEVEL: 'SET_ZOOM_LEVEL',
    SET_DOMAIN_NAME: 'SET_DOMAIN_NAME',
    SET_SITE_LIST: 'SET_SITE_LIST',
    SET_REGULAR_EXPRESSION: 'SET_REGULAR_EXPRESION'
}
const MUTATIONS = {
    SET_ZOOM_LEVEL: 'SET_ZOOM_LEVEL',
    SET_DOMAIN_NAME: 'SET_DOMAIN_NAME',
    SET_SITE_LIST: 'SET_SITE_LIST',
    SET_REGULAR_EXPRESSION: 'SET_REGULAR_EXPRESION'
}
const EVENTS = {
    LIST_CHANGE: 'LIST_CHANGE',
    STATE_CHANGE: 'STATE_CHANGE',
    DOMAIN_CHANGE: 'DOMAIN_CHANGE',
    REGEXP_CHANGE: 'REGEXP_CHANGE',
    ZOOM_LEVEL_CHANGE: 'ZOOM_LEVEL_CHANGE'
}

const ZOOM_BTN_STEP = 5;
const DEFAULT_ZOOM = 100;

// -----------------------------------------------
// Beedle state management object
let storeInstance = new beedle({
    actions: {
        /**
         * Setting the zoom level udates the label
         */
        [ACTIONS.SET_ZOOM_LEVEL](context, value) {
            context.commit(MUTATIONS.SET_ZOOM_LEVEL, value);
            if(zoomLevelInput.value !== value){
                zoomLevelInput.value = value
            }                
            document.querySelector("#zoomLevelLbl").innerHTML = value + "%";
        },
        /**
         * Setting the domain validates it against regexp/normal domain checks
         */
        [ACTIONS.SET_DOMAIN_NAME](context, domainName) {
            context.commit(MUTATIONS.SET_DOMAIN_NAME, domainName);
            if(domainNameInput.value !== domainName){
                domainNameInput.value = domainName   
            }
            validateDomainInput();
        },
        /**
         * When the site list changes re render it
         */
        [ACTIONS.SET_SITE_LIST](context, siteList) {
            context.commit(MUTATIONS.SET_SITE_LIST, siteList);
            makeSitesList();
        },
        /**
         * When the checkbox for regexp changes revalidate the input
         */
        [ACTIONS.SET_REGULAR_EXPRESSION](context, regexp) {
            context.commit(MUTATIONS.SET_REGULAR_EXPRESSION, regexp);
            if(regexpCheckbox.checked !== regexp){
                regexpCheckbox.checked = regexp    
            }
            validateDomainInput();
        }
    },
    mutations: {
        [MUTATIONS.SET_ZOOM_LEVEL](state, value) {
            state.management.zoomLevel = value;
            return state;
        },
        [MUTATIONS.SET_DOMAIN_NAME](state, domainName) {
            state.management.domainName = domainName;
            return state;
        },
        [MUTATIONS.SET_SITE_LIST](state, siteList) {
            state.management.sites = siteList;
            return state;
        },
        [MUTATIONS.SET_REGULAR_EXPRESSION](state, regexp) {
            state.management.regexp = regexp;
            return state;
        }
    },
    initialState: {
        management:{
            sites: {},
            validUrl: false,
            zoomLevel: DEFAULT_ZOOM,
            domainName: '',
            regexp: false
        }
    }
});
// ------------------------------------------------------
// DOM elements
let plusBtn = document.querySelector("#plusButton");
let lessBtn = document.querySelector("#lessButton");
let partialRuleBtn = document.querySelector("#partialRuleButton");
let zoomLevelInput = document.querySelector("#zoomLevel");
let domainNameInput = document.querySelector("#domainName");
let addNewRuleBtn = document.querySelector("#addNewRule");
let sitesListDiv = document.querySelector("#sitesList");
let sitesListContainer = document.querySelector("#sitesListContainer");
let regexpCheckbox = document.querySelector("#regexpCheckbox");
let regexpContainer = document.querySelector("#regexpContainer");
let deleteAllRulesBtn = document.querySelector("#deleteAllRules");

// -------------------------------------------------------
// Funcions to handle DOM Events
/**
 * Adds more zoom with the buttons
 * @param {*} event 
 */
const moreZoom = function(event) {
     event.preventDefault();     
     let value = storeInstance.state.management.zoomLevel;
     if (value % 5) value -= value % 5;
     value = value + ZOOM_BTN_STEP;
     storeInstance.dispatch(ACTIONS.SET_ZOOM_LEVEL, value);
 }
 /**
  * Substracts zoom with the buttons
  * @param {*} event 
  */
const lessZoom = function(event) {
     event.preventDefault();
     let value = storeInstance.state.management.zoomLevel;
     if (value % 5) value -= value % 5 - ZOOM_BTN_STEP;
     value = value - ZOOM_BTN_STEP;
     storeInstance.dispatch(ACTIONS.SET_ZOOM_LEVEL, value);
}

/**
 * Sets the value of the zoom from the slider
 * @param {*} event 
 */
const setZoom = function(event){
    storeInstance.dispatch(ACTIONS.SET_ZOOM_LEVEL, zoomLevelInput.value);
}

/**
 * Sets the name of the domain from the text input
 * @param {*} event 
 */
const setDomain = function(event){
    storeInstance.dispatch(ACTIONS.SET_DOMAIN_NAME, domainNameInput.value);
}

/**
 * Adds a new rule for a specific site on button click inside the settings
 * partial means search for a string inside the url and not check the domain
 * useful for matching moz-extension and other weird urls
 * @param {*} event 
 */
const addNewRule = function(event){
    event.preventDefault(); 
    let domain = storeInstance.state.management.domainName;
    let zoom =  storeInstance.state.management.zoomLevel;
    let regexp = storeInstance.state.management.regexp;
    
    let partial = false;

    if(regexp){
        // do nothing
    }
    else if(domain.indexOf("#") === 0){
        partial = true;
        domain = domain.substr(1)
    }else{
        domain = domain.replace('https://', '').replace('http://', '');
        domain = domain.replace(/^www\./, '');
        domain = trimSpecial(domain, '/');
    }
    
    browser.runtime.sendMessage({
        method: "saveCustomSiteRule",
        site: {domain: domain, zoom: zoom, partial: partial, regexp: regexp}
    }).then(function(){
        loadSavedSettings();
        resetForm();
    });
}

/**
 * Shows explanation div for advanced rules
 * @param {*} event 
 */
const showPartialInstructions = function(event){
    event.preventDefault();
    let instructionsDiv = document.querySelector("#partialRuleDescription");
    //getComputedStyle(instructionsDiv, 'display') === 'block' ? 'none' : 'block';
    instructionsDiv.style.display = instructionsDiv.style.display === '' ? 'block' : '' ;  
}

/**
 * Stores if the input is a regular expression or not
 * @param {*} event 
 */
const setRegularExpression = function(event){
    storeInstance.dispatch(ACTIONS.SET_REGULAR_EXPRESSION, regexpCheckbox.checked ? true : false)
    // can't trust those js booleans!
}

// Text input validation handlers
const disableInput = function(){
    addNewRuleBtn.classList.add('disabledOption');
}
const enableInput = function() {
    addNewRuleBtn.classList.remove('disabledOption');
}
const markErrorInput = function(){
    domainNameInput.classList.add("errorInput");
}
const removeErrorInput = function() {
    domainNameInput.classList.remove("errorInput");
}
const markValidInput = function() {
    domainNameInput.classList.add("validInput");
}
const removeValidInput = function() {
    domainNameInput.classList.remove("validInput");
}
//-----------------------------------------------------------
/**
 * Loads saved and default settings in the options panel
 */
function loadSavedSettings() {
    function setCurrentChoice(result) {
         storeInstance.dispatch(ACTIONS.SET_SITE_LIST, result.sites || []);
         if(result.allowRegexp){
            regexpContainer.classList.remove('hide');
         }
         validateDomainInput();
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }
    
    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError);
}

function resetForm(){
    storeInstance.dispatch(ACTIONS.SET_DOMAIN_NAME, '');
    storeInstance.dispatch(ACTIONS.SET_ZOOM_LEVEL, DEFAULT_ZOOM);
    storeInstance.dispatch(ACTIONS.SET_REGULAR_EXPRESSION, false);
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

const deleteAllRulesHandler = function(){
    browser.runtime.sendMessage({
        method: "deleteAllRules",
    }).then(function(){
        loadSavedSettings();
    });    
}

const makeSitesList = function(){
    let sites = storeInstance.state.management.sites;
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
        else if(sites[i].regexp){
            let partialSpan = document.createElement('span');
            partialSpan.className = "partialDomain";
            let partialText = document.createTextNode(' (Regexp)');
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
        removeIcon.className = "removeIcon icon";
        removeIcon.src = '../icons/remove.svg';
        removeIcon.title = 'Remove current rule';
        removeIconDiv.appendChild(removeIcon);
        
        removeIcon.onclick = function(){
            let site = sites[i];
            browser.runtime.sendMessage({
                method: "deleteCustomSiteRule",
                site: site
            }).then(function(){
                loadSavedSettings();
            });            
        }

        let editIconDiv = document.createElement('div');
        editIconDiv.className = 'flexZero removeIconDiv';
        let editIcon = document.createElement('img');
        editIcon.className = "editIcon icon";
        editIcon.src = '../icons/edit.png';
        editIcon.title = 'Edit current rule';
        editIconDiv.appendChild(editIcon);
        
        editIcon.onclick = function(){
            let site = sites[i];
            let domain = site.domain;
            if(site.partial){
                domain = '#' + site.domain;
            }

            storeInstance.dispatch(ACTIONS.SET_DOMAIN_NAME, domain);
            storeInstance.dispatch(ACTIONS.SET_ZOOM_LEVEL, site.zoom);
            storeInstance.dispatch(ACTIONS.SET_REGULAR_EXPRESSION, site.regexp);
        }


        siteDiv.appendChild(domainDiv);
        siteDiv.appendChild(zoomDiv);
        siteDiv.appendChild(editIconDiv);
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
 * Validates the domain input whent its a regular expression
 */
const validateRegularExpression = function(){
    let regularExpression = storeInstance.state.management.domainName;

    let valid = true;

    if(regularExpression.length < 1){
        valid = false
    }else{
        try {
            new RegExp(regularExpression);
        } catch(e) {
            isValid = false;
        }    
    }    
    
    if(valid){
        markValidInput();
        enableInput();
    }else{
        markErrorInput();
        disableInput();
    }
}

/**
 * Validates the input
 */
const validateDomainInput = function(){
    let regexp = storeInstance.state.management.regexp;
    if(regexp){
        validateRegularExpression();
    }else{
        validateDomain();
    }
}

/**
 * Validate the domain entered by the user
 */
const validateDomain = function(){
    let val = storeInstance.state.management.domainName;

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

/**
 * Attach events to event handlers
 */
document.addEventListener("DOMContentLoaded", loadSavedSettings);
domainNameInput.addEventListener('change', setDomain);
domainNameInput.addEventListener('input', setDomain);
plusBtn.addEventListener("click", moreZoom);
lessBtn.addEventListener("click", lessZoom);
zoomLevelInput.addEventListener('change', setZoom);
zoomLevelInput.addEventListener('input', setZoom);
addNewRuleBtn.addEventListener("click", addNewRule);
partialRuleBtn.addEventListener("click", showPartialInstructions);
regexpCheckbox.addEventListener("change", setRegularExpression);
deleteAllRulesBtn.addEventListener("click", deleteAllRulesHandler);