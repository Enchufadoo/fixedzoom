const LOG_CONST = 'FIXEDZOOM ERROR: '

const onError = function(error){
    console.log(LOG_CONST, error);
}

const loadSettings = function(){
    return browser.storage.local.get();    
}

/**
 * Changes the zoom level based on saved settings
 * if it hasnt been enabled then it won't
 * @param {zoomLevel, enabled} settings 
 */
const changeZoom = function(settings){
    
    if(settings && settings.enabled){
        if(!settings.zoomLevel){
            onError('Zoom missing');        }
        if(settings.zoomLevel >= 10 && settings.zoomLevel <= 200){
            browser.tabs.setZoom(settings.zoomLevel / 100);
        }else{
            onError('Zoom value is invalid ' + settings.zoomLevel);
        }
    }
}

/**
 * Loads the settings and then calls the zoom changing funcion, literally
 * @param {*} settings 
 */
const startScript = function(settings){    
    loadSettings().then(changeZoom, onError);
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
            notifySettingsSaved();
            break;
	}
});
