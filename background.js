const LOG_CONST = 'FIXEDZOOM ERROR: ';
const NOTIFICATION_DURATION = 1500;
let enabled = false;
let zoomLevel = 100;

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

        enabled = settings.enabled;
        zoomLevel = settings.zoomLevel;
    });
}

/**
 * Changes the zoom level based on saved settings
 * 
 * @param {zoomLevel, enabled} settings 
 */
const changeZoom = function(tabId){
    if(enabled){
        if(tabId){
            /**
             * I do this twice because if there's a saved zoom for a webpage
             * the browser after allowing the new zoom change
             * will fallback to that saved zoom right after,
             * I hope 1000ms will work everywhere, but probably won't
             */
            browser.tabs.setZoom(tabId, zoomLevel / 100);
            setTimeout(() => {
                browser.tabs.setZoom(tabId, zoomLevel / 100);
            }, 1500)
        }else{
            browser.tabs.setZoom(zoomLevel / 100);
        }            
    }
}

const changeZoomInAllTabs = function() {
    var querying = browser.tabs.query({});
    
    querying.then(changeZoomInTabs, onError);
}

const tabUpdateListener = function(tabId, info, tab) {
    if (info.status === 'complete') {
        changeZoomInTabs([tab]);
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

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.method) {
        case "settingsSaved":
            loadSettings().then(function(){
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
