const LOG_CONST = 'FIXEDZOOM ERROR: ';
const NOTIFICATION_DURATION = 1500;
let scriptInitialized = false;
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
    
    scriptInitialized = true;
    return browser.storage.local.get().then(function(settings){
        if(!settings.enabled) {
            return;
        }
         
        if(!settings.zoomLevel){
            onError('Zoom missing');
            return;
        }        
        if(settings.zoomLevel < 10 || settings.zoomLevel > 300){
            onError('Zoom value is invalid ' + settings.zoomLevel);
            return;
        }

        enabled = settings.enabled
        zoomLevel = settings.zoomLevel 

        changeZoom();
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
            }, 1000)
        }else{
            browser.tabs.setZoom(zoomLevel / 100);
        }            
    }
}

/**
 * Loads the settings and then calls the zoom changing funcion, literally
 * @param {*} settings 
 */
const startScript = function(settings){   
    if(!scriptInitialized){
        loadSettings();
    }else{
        changeZoom();
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
		case "startFixedZoom":
            startScript();
            break;
        case "settingsSaved":
            loadSettings();
            notifySettingsSaved();
            break;
	}
});

/**
 * When a new tab is created the  browser.tabs.setZoom will act on the current tab not on the one created
 * so I have to do this
 */
browser.tabs.onCreated.addListener(function(tab){
    changeZoom(tab.id);
})
