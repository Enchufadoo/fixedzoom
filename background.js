(function(){
    const LOG_CONST = 'FIXEDZOOM ERROR: ';
    let enabled = false;
    let zoomLevel = 100;
    let scriptInitialized = false;
    let sites = [];
    let tabUrlZoomList = {};
    let tabCompleteList = {};
    let saveZoomRuleTimer = false;
    let allowRegexp = false;
    let allowAutoRule = false;
    
    class SiteConfig{
        constructor(zoom, domain, partial, regexp){
            this.zoom = parseInt(zoom);
            this.domain = domain.trim();
            this.partial = partial ? partial : false; 
            this.regexp = regexp ? regexp : false;
        }
    }

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
            scriptInitialized = true;
            tabUrlZoomList = {};
            if(settings.sites){ 
                sites = settings.sites.map(function(x){
                    return new SiteConfig(x.zoom, x.domain, x.partial, x.regexp);
                });
            } 
            if(settings.allowRegexp){ 
                allowRegexp = settings.allowRegexp;
            } 
            if(settings.allowAutoRule){ 
                allowAutoRule = settings.allowAutoRule;
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
                }
                else if(siteRule.regexp){
                    let regexp = new RegExp(siteRule.domain);
                    if(regexp.test(tab.url)){
                        matchZoom = siteRule.zoom;
                        break;
                    }
                }
                else{
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
            
            /**
             * Monitor which tabs have a complete status so any posterior zoom change
             * problably (I think, maybe, most likely) come from the user
             * so if the option of creating rules automaticly is enabled
             * create a new rule
             */
            if(tab.status === 'complete'){
                tabCompleteList[tabId] = tab.url;
            } 
            else{
                tabCompleteList[tabId] = undefined;
            }

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
        

        if (browser.tabs.onZoomChange.hasListener(handleZoomed)) {
            if (!enabled || !allowAutoRule) {
                browser.tabs.onZoomChange.removeListener(handleZoomed);
            }
        } else {
            if (enabled && allowAutoRule) {
                browser.tabs.onZoomChange.addListener(handleZoomed);
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
        let newSites = []
            if(sites.length){                
                newSites = sites.filter(function(site){
                    // the partial check it's because you could have the same string
                    // in a partial search and in a domain
                    if(site.domain != newRule.domain){
                        return true;
                    }else{
                        let same = site.partial === newRule.partial && site.regexp === newRule.regexp;
                        return !same;
                    }
                    
                })            
            }
            newSites.push(newRule);
    
            return browser.storage.local.set({
                sites: newSites
            });
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
                    }
                    else{
                        let same = site.partial === siteToDelete.partial && site.regexp === siteToDelete.regexp;
                        return !same;
                    }
                });      
                return browser.storage.local.set({
                    sites: newSites
                });
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

    /**
     * Saves wheter or not allow regular expressions
     * @param {*} allowRegexp 
     */
    const saveAllowRegexp = function(allowRegexp){
        loadSettings().then(function(){
            
            browser.storage.local.set({
                allowRegexp: allowRegexp
            })
    
            settingsSaved();
        })    
    }

    /**
     * Saves wheter or not allow automatic rules when there's a zoom change
     * @param {*} allowRegexp 
     */
    const saveAllowAutoRule = function(allowAutoRule){
        loadSettings().then(function(){            
            browser.storage.local.set({
                allowAutoRule: allowAutoRule
            })
    
            settingsSaved();
        })    
    }

    /**
     * Handles zoom events to create new rules automatically
     * @param {*} zoomChangeInfo 
     */
    function handleZoomed(zoomChangeInfo) {
        /**
         * The settimeout its because firefox triggers multiple times the zoomhandler when the zoom 
         * changes, say if I were to set it to 0.9 this is what happens SOMETIMES
         * 0.9
         * 1
         * 0.9
         */
        if(tabCompleteList[zoomChangeInfo.tabId]){
            if(saveZoomRuleTimer) clearTimeout(saveZoomRuleTimer);
            saveZoomRuleTimer = setTimeout(function(){
                let zoom = parseInt(zoomChangeInfo.newZoomFactor * 100)
                let url = tabCompleteList[zoomChangeInfo.tabId];
                let currentHostname = (new URL(url)).hostname.replace(/^www\./, '');
                
                saveCustomSiteRule({
                    zoom: zoom,
                    domain: currentHostname,
                    partial: false,
                    regexp: false
                }).then(function(){
                    loadSettings();
                });
            }, 200);          
        }
        
    }
    
    browser.runtime.onMessage.addListener((message, sender) => {
        switch (message.method) {
            case "saveCustomSiteRule":
                let retSave = saveCustomSiteRule(message.site);
                Promise.resolve(retSave).then(() => {
                    settingsSaved();
                })
                break;
            case "deleteCustomSiteRule":
                let retDel = deleteCustomSiteRule(message.site);
                Promise.resolve(retDel).then(() => {
                    settingsSaved();
                })                
                break;
            case "getCurrentUrl":
                return getCurrentUrl();
            case "restoreDefaultZoom":
                 restoreDefaultZoom();
                 break;
            case "openSiteRulesManagement":
                browser.tabs.create({
                    "url": "/management/management.html"
                });
                break;
            case "setAllowRegexp":
                saveAllowRegexp(message.allowRegexp);
                break;
            case "setAllowAutoRule":
                saveAllowAutoRule(message.allowAutoRule);
                break;
            case "settingsSaved":
                settingsSaved();
                break;
        }
    });
    
    
    if(!scriptInitialized){
        
        loadSettings().then(function () {
            enableSettings();
        });
    }       
         
})();
