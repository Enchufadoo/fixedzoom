const LOG_CONST = 'FIXEDZOOM ERROR: ';
const NOTIFICATION_DURATION = 2000;
let enabled = false;
let zoomLevel = 100;
let scriptInitialized = false;
let sites = [];

const onError = function(error){
    console.log(LOG_CONST, error);
}
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

        if(settings.sites) sites = settings.sites;
        enabled = settings.enabled;
        zoomLevel = settings.zoomLevel;
    });
}

/**
 * Changes the zoom level on the given tabs based on saved settings.
 * complete is if a tab has finish loading
 * I only do the url check if the tab has finished loading for perfomance...
 * this gets called many times 
 * 
 * @param {zoomLevel, enabled} settings 
 */
const changeZoomInTabs = function(tabs, complete = false) {    
    for (let tab of tabs) {
        if(enabled){
            /**
             * var holding a specific site zoom
             */
            let matchZoom = false; 
            // look for the zoom in settings sites and if theres a match save it in a variable
            // @todo improve
            if(sites.length){
                for(site in sites){
                    let currentHostname = (new URL(tab.url)).hostname.replace(/^www\./, '');
                    if(currentHostname == sites[site].domain){
                        matchZoom = sites[site].zoom;
                        break;
                    }
                }    
            }
            
            let newZoom = matchZoom || zoomLevel
            browser.tabs.setZoom(tab.id, newZoom / 100);
        } else {
            browser.tabs.setZoom(tab.id, 1);
        }
    }
}

const changeZoomInAllTabs = function() {
    var querying = browser.tabs.query({});
    querying.then(changeZoomInTabs, onError);
}


const tabUpdateListener = function(tabId, info, tab) {
    /**
     * This gets called many times, but if I dont do it 
     * the zoom wont be applied on page load which means 
     * there's a couple of seconds in which the zoom will be 100% sometimes
     * even if I do it only once with a flag from the tab.id
     */
    changeZoomInTabs([tab]);
    //

    if (info.status === 'complete') {
        changeZoomInTabs([tab], true);
    }
}

/**
 * Small popup indicating settings were saved
 */
const notifySettingsSaved = function(){    
    browser.notifications.create('fixedzoom', {
        "type": "basic",
        "title": "Settings Saved",
        "message": "Fixed zoom settings saved",
        "iconUrl": "icons/binoculars.png",
        "priority": 1
      }).then(function(n){
        setTimeout(() => {
            browser.notifications.clear(n);
        }, NOTIFICATION_DURATION);        
      });
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

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.method) {
        case "startFixedZoom":
            loadSettings().then(function () {
                enableSettings();
            });
            break;
        case "openSiteRulesManagement":
            browser.tabs.create({
                "url": "/management/management.html"
            });
            break;
        case "settingsSaved":
            loadSettings().then(function(){
                enableSettings();                
                changeZoomInAllTabs();                
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
                
                notifySettingsSaved();
            });
            break;
	}
});
