const LOG_CONST = 'FIXEDZOOM ERROR: ';
let enabled = false;
let zoomLevel = 100;
let scriptInitialized = false;
let sites = [];
let tabUrlZoomList = {};

const onError = function(error){
    console.log(LOG_CONST, error);
}

/**
 * Keeps track of which tab has an url with a specific zoom 
 * Not to check on every tab update
 */
const addUrlZoomList = (tabId, zoomLevel) => {tabUrlZoomList[tabId] = zoomLevel}
const removeUrlZoomList = tabId => {tabUrlZoomList[tabId] = undefined}

/**
 * Loads the settings and enables the new zoom 
 * if the zoom is valid
 */
const loadSettings = function(){
    return browser.storage.local.get().then(function(settings){
        
        if(!settings.zoomLevel){
            onError('Zoom missing');
            return;
        }        
        if(settings.zoomLevel < 10 || settings.zoomLevel > 300){
            onError('Zoom value is invalid ' + settings.zoomLevel);
            return;
        }
        scriptInitialized = true;
        tabUrlZoomList = {};
        if(settings.sites) sites = settings.sites;
        enabled = settings.enabled;
        zoomLevel = settings.zoomLevel;
    });
}

/**
 * Apply the zoom to all tabs
 * @param {tabs}  
 */
const changeZoomInTabs = function(tabs) {   
    for (let tab of tabs) {
        changeZoomInSingleTab(tab)
    }
}

/**
 * Change the zoom in all browser tabs (after settings are loaded)
 */
const changeZoomInAllTabs = function() {
    var querying = browser.tabs.query({});
    querying.then(changeZoomInTabs, onError);
}

/**
 * Changes the zoom of a single tab
 * @param {browser.tabs.tab} tab 
 */
const changeZoomInSingleTab = function(tab){
    /**
     * First check if there are sites with custom zoom
     * If there are, try to find the zoom for the current url
     * If there's a match save that into an array so that the zoom
     * lookup doesn't happen on each tabupdate event
     * 
     * When the url changes, the value in the array it's cleared
     * @see tabUpdateListener
     */
    let matchZoom = false; 
    if(sites.length && typeof tabUrlZoomList[tab.id] == 'undefined'){
        for(site in sites){
            let currentHostname = (new URL(tab.url)).hostname.replace(/^www\./, '');
            if(currentHostname == sites[site].domain){
                matchZoom = sites[site].zoom;
                break;
            }
        }
        tabUrlZoomList[tab.id] = matchZoom;
    }
    
    let newZoom = tabUrlZoomList[tab.id] || zoomLevel ;
    browser.tabs.setZoom(tab.id, newZoom / 100);
}

const tabUpdateListener = function(tabId, info, tab) {
    /**
     * This gets called many times, but if I dont do it 
     * the zoom wont be applied on page load which means 
     * there's a couple of seconds in which the zoom will be 100%
     */
    if(enabled){
        /**
         * If theres a change in the tab url cleanup the saved value for that url
         */
        if(info.url) removeUrlZoomList(tabId)

        changeZoomInSingleTab(tab);
    }
}

/**
 * After the settings have been load, update the tabs zoom
 */
const enableSettings= function(){
    changeZoomInAllTabs();
    if (browser.tabs.onUpdated.hasListener(tabUpdateListener)) {
        if (!enabled) {
            // actually remove the listener to remove any overhead
            browser.tabs.onUpdated.removeListener(tabUpdateListener);
        }
    } else {
        if (enabled) {
            browser.tabs.onUpdated.addListener(tabUpdateListener);
        }
    }
}

/**
 * Restores the default browser zoom 100%
 */
const restoreDefaultZoom = function(){
     var querying = browser.tabs.query({});
     querying.then(function(tabs){
         for (let tab of tabs) {
             browser.tabs.setZoom(tab.id, 1);
         }
     }, onError);
}

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.method) {
         case "restoreDefaultZoom":
             restoreDefaultZoom();
             break;
        case "startFixedZoom":
            if(!scriptInitialized){
                loadSettings().then(function () {
                    enableSettings();
                });
            }            
            break;
        case "openSiteRulesManagement":
            browser.tabs.create({
                "url": "/management/management.html"
            });
            break;
        case "settingsSaved":
            loadSettings().then(function(){
                enableSettings();                           
                if (browser.tabs.onUpdated.hasListener(tabUpdateListener)) {
                    if (!enabled) {
                        // actually remove the listener to remove any overhead
                        browser.tabs.onUpdated.removeListener(tabUpdateListener);
                    }
                }
                else {
                    if (enabled) {
                        browser.tabs.onUpdated.addListener(tabUpdateListener);
                    }
                }
            });
            break;
	}
});
