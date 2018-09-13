(function(){
    const LOG_CONST = 'FIXEDZOOM ERROR: ';
    let enabled = false;
    let zoomLevel = 100;
    let scriptInitialized = false;
    let sites = [];
    let tabUrlZoomList = {};
    
    /**
     * Save the last used url in case someone wants to change the zoom
     * from inside a firefox extension page, or some other weird page
     * 
     * If the addon popup was opened when it was in say google.com
     * but then the url changes to something else like moz-extension:blablabla
     * then that will be the url that will be used, if I could pass ?site=...
     * to the custom_site section there would be no problem, but I dont know how
     */
    let lastUsedUrl = false;
    
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
            if(settings.sites){ 
                sites = settings.sites;
            } 
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
        if(sites.length && typeof tabUrlZoomList[tab.id] == 'undefined'){
            let sitesReversed = sites.slice().reverse();
            let matchZoom = false; 
            for(site in sitesReversed){
                let siteRule = sitesReversed[site];
                if(siteRule.partial){
                    // If there's a partial string search as opposed to a domain search
                    if(tab.url.indexOf(siteRule.domain) !== -1){
                        matchZoom = siteRule.zoom;
                        break;
                    }
                }else{
                    let currentHostname = (new URL(tab.url)).hostname.replace(/^www\./, '');
                    if(currentHostname == siteRule.domain){
                        matchZoom = siteRule.zoom;
                        break;
                    }
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
        if(enabled){
            changeZoomInAllTabs();
        }        
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
    
    /**
     * Sends to the frontend the url of the current active tab in the current active window
     */
    const getCurrentUrl = function(){
        return new Promise((resolve, reject) => {
            browser.tabs.query({active: true, windowId: browser.windows.WINDOW_ID_CURRENT})
            .then(tabs => browser.tabs.get(tabs[0].id))
            .then(tab => {
                let url = tab.url;
                let urlObj =  new URL(url)
                let validProtocol = urlObj.protocol && urlObj.protocol !== 'moz-extension:' ;
                
                if(validProtocol){
                    lastUsedUrl = tab.url
                }
                resolve(lastUsedUrl);
            });
        });   
    }
    
    /**
     * Adds a rule for a site
     * if it had a rule delete it frist
     * @param {*} newRule 
     */
    const saveCustomSiteRule = function(newRule){
        loadSettings().then(function(){
            let newSites = []
            if(sites.length){
                newSites = sites.filter(function(site){
                    // the partial check it's because you could have the same string
                    // in a partial search and in a domain
                    if(site.domain != newRule.domain){
                        return true;
                    }else{
                        return site.partial != newRule.partial
                    }
                    
                })            
            }
            newSites.push(newRule);
    
            browser.storage.local.set({
                sites: newSites
            })
    
            settingsSaved();
        })    
    }
    
    /**
     * Deletes a site rule from the saved settings
     */
    const deleteCustomSiteRule = function(siteToDelete){
        loadSettings().then(function(){
            if(sites.length){
                let newSites = sites.filter(function(site){
                    if(site.domain != siteToDelete.domain){
                        return true;
                    }else{
                        return site.partial != siteToDelete.partial
                    }
                });      
                browser.storage.local.set({
                    sites: newSites
                });
                settingsSaved();
            }
        })
        
    }
    
    /**
     * Reload everything from local storage
     * and update the tab listeners
     */
    const settingsSaved = function(){
        loadSettings().then(function(){
            enableSettings();    
        });
    }
    
    browser.runtime.onMessage.addListener((message, sender) => {
        switch (message.method) {
            case "saveCustomSiteRule":
                saveCustomSiteRule(message.site);
                break;
            case "deleteCustomSiteRule":
                deleteCustomSiteRule(message.site);
                break;
            case "getCurrentUrl":
                return getCurrentUrl();
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
                settingsSaved();
                break;
        }
    });
    
})();
