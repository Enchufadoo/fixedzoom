const LOG_CONST = 'FIXEDZOOM ERROR: '

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
        if(!zoomLevel){
            onError('Zoom missing');
            return;
        }        
        if(zoomLevel < 10 || zoomLevel > 200){
            onError('Zoom value is invalid ' + zoomLevel);
            return;
        }

        enabled = settings.enabled
        zoomLevel = settings.zoomLevel 
    });    
}

/**
 * Changes the zoom level based on saved settings
 * 
 * @param {zoomLevel, enabled} settings 
 */
const changeZoom = function(){
    if(enabled){
        browser.tabs.setZoom(zoomLevel / 100);
    }
}

/**
 * Loads the settings and then calls the zoom changing funcion, literally
 * @param {*} settings 
 */
const startScript = function(settings){   
    if(!scriptInitialized){
        loadSettings().then(changeZoom, onError);
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
        "iconUrl": "icons/binoculars.png"
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
