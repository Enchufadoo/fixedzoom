(function () {
    const LOG_CONST = 'FIXEDZOOM ERROR: ';
    const ZOOM_SHORTCUT_STEP = 5;
    const DEFAULT_ZOOM = 100;
    const DEFAULT_PROFILE = 0;

    const COLOR_BLACK = 'black';
    class ZoomProfile {
        /**
         * Data for a zoom profile, there can be repeated names
         * @param {number} zoom 
         * @param {array} sites 
         * @param {string} name
         */
        constructor(zoomLevel, sites, name) {
            this.zoomLevel = parseInt(zoomLevel);
            this.sites = sites ? sites : [];
            this.name = name ? name : 'Unnamed';
        }
    }
    class Settings {
        constructor() {
            this.enabled = false;
            this.scriptInitialized = false;
            this.allowRegexp = false;
            this.allowAutoRule = false;
            this.allowMultipleMonitors = false;
            this.allowKeyboardShortcut = false;
            this.allowProfiles = false;
            this.iconColor = COLOR_BLACK;
            this.profiles = [];
            this.profile = DEFAULT_PROFILE;
        }
        /**
         * Always use profiles instead of holding a separate variable
         * for the zoom level, same for sites
         */
        set zoomLevel(value) {
            this.profiles[this.profile].zoomLevel = value;
        }
        get zoomLevel() {
            return this.profiles[this.profile].zoomLevel;
        }
        set sites(value) {
            this.profiles[this.profile].sites = value;
        }
        get sites() {
            return this.profiles[this.profile].sites;
        }

        /**
         * Saves a new zoom level
         * @param {number} zoomLevel 
         */
        saveZoomLevel(zoomLevel) {
            if (zoomLevel >= 30 && zoomLevel <= 300) {
                this.zoomLevel = zoomLevel;
                return this.saveProfiles();
            }
        }

        /**
         * Save wheter or not to enable the extension
         * @param {*} enabled 
         */
        saveEnabledStatus(enabled) {
            this.enabled = enabled;
            return browser.storage.local.set({
                enabled: enabled
            });
        }

        /**
         * Saves the new sites rules array
         * @param {*} sites 
         */
        saveSitesStorage(sites) {
            this.sites = sites;
            tabUrlZoomList = {};
            return this.saveProfiles();
        }

        /**
         * Creates a new profile with the default settings
         * @param {*} name 
         */
        createNewProfile(name) {
            this.profiles.push(
                new ZoomProfile(DEFAULT_ZOOM, [], name)
            );
            return this.saveProfiles();
        }

        /**
         * Changes the profile (index of the profiles array which is active)
         * @param {*} profile 
         */
        saveProfile(profile) {
            return browser.storage.local.set({
                "profile": profile
            });
        }

        saveProfiles() {
            return browser.storage.local.set({
                "profiles": this.profiles
            });
        }

        /**
         * Save a setting in the storage
         * @param {string} setting 
         * @param {*} value 
         */
        saveAdvancedSetting(setting, value) {
            this[setting] = value;
            return browser.storage.local.set({
                [setting]: value
            });
        }

        /**
         * Change the extension icon when the value is set
         */
        set iconColor(value) {
            if (value === COLOR_BLACK) {
                browser.browserAction.setIcon({
                    path: "icons/binoculars_black.png"
                });
            } else {
                browser.browserAction.setIcon({
                    path: "icons/binoculars_white.png"
                });
            }
        }

        /**
         * If there are not profiles created load the default settings into the first profile
         */
        initializeProfiles() {
            if (this.profiles.length === 0) {
                this.profiles[DEFAULT_PROFILE] = new ZoomProfile(DEFAULT_ZOOM, [],
                    chrome.i18n.getMessage('defaultProfileOption'));
                return browser.storage.local.set({
                    profiles: this.profiles
                });
            }
        }

        /**
         * If the profile if different from the default profile
         * delete it, save it in storage and fallback to the default profile
         * @param {*} profile 
         */
        deleteProfile(profile) {
            if (profile > DEFAULT_PROFILE && profile < this.profiles.length) {
                this.profiles.pop(profile);

                return browser.storage.local.set({
                    'profiles': this.profiles
                }).then(function () {
                    return this.changeProfile(DEFAULT_PROFILE);
                }.bind(this));
            }
        }

        /**
         * Sets the current profile, and triggers a zoomchange after
         * 
         * @param {number} profile 
         */
        changeProfile(profile) {
            tabUrlZoomList = {};
            this.profile = profile;
            return this.saveProfile(profile).then(function () {
                changeZoomInAllTabs();
            });
        }

        /**
         * Clears all saved sites settings
         */
        deleteAllRules() {
            return this.saveSitesStorage([]);
        }

    }
    /**
     * Data structure for a zoom rule
     */
    class SiteConfig {
        constructor(zoom, domain, partial, regexp) {
            this.zoom = parseInt(zoom);
            this.domain = domain.trim();
            this.partial = partial ? partial : false;
            this.regexp = regexp ? regexp : false;
        }
    }

    let extSettings = new Settings();
    let tabUrlZoomList = {};
    let tabCompleteList = {};

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

    const onError = function (error) {
        console.log(LOG_CONST, error);
    };

    /**
     * Keeps track of which tab has an url with a specific zoom 
     * Not to check on every tab update
     */
    const removeUrlZoomList = tabId => {
        tabUrlZoomList[tabId] = undefined;
    };

    /**
     * Loads the settings and enables the new zoom 
     * if the zoom is valid
     */
    const loadSettings = function () {
        return browser.storage.local.get().then(function (settings) {
            extSettings.scriptInitialized = true;
            tabUrlZoomList = {};

            /**
             * Black icon by default
             */
            extSettings.iconColor = settings.iconColor ? settings.iconColor : COLOR_BLACK;

            [
                'allowRegexp',
                'allowAutoRule',
                'allowKeyboardShortcut',
                'allowRegexp',
                'allowProfiles',
                'profiles',
                'enabled',
                'profile'
            ].map((set) => {
                if (settings[set]) {
                    extSettings[set] = settings[set];
                }
            });

            extSettings.initializeProfiles();

            /** why did I use map? @TODO */
            extSettings.profiles = extSettings.profiles.map(function (pro) {
                pro.sites = pro.sites.map(function (site) {
                    if (pro.sites) {
                        pro.sites = pro.sites.map(function (x) {
                            return new SiteConfig(x.zoom, x.domain, x.partial, x.regexp);
                        });
                    }
                    return site;
                });
                return pro;
            });

        });
    };

    /**
     * Change the zoom in all browser tabs (after settings are loaded)
     * @param {integer} exceptTabId dont change the zoom in that particular tab
     */
    const changeZoomInAllTabs = function (exceptTabId = false) {
        var querying = browser.tabs.query({});
        querying.then(function (tabs) {
            for (let tab of tabs) {
                if (tab.id !== exceptTabId) {
                    changeZoomInSingleTab(tab);
                }
            }
        }, onError);
    };

    /**
     * Changes the zoom of a single tab
     * @param {browser.tabs.tab} tab 
     */
    const changeZoomInSingleTab = function (tab) {
        /**
         * First check if there are sites with custom zoom
         * If there are, try to find the zoom for the current url
         * If there's a match save that into an array so that the zoom
         * lookup doesn't happen on each tabupdate event
         * 
         * When the url changes, the value in the array it's cleared
         * @see tabUpdateListener
         */

        if (extSettings.sites.length && typeof tabUrlZoomList[tab.id] == 'undefined') {
            let sitesReversed = extSettings.sites.slice().reverse();
            let matchZoom = false;
            for (let site in sitesReversed) {
                let siteRule = sitesReversed[site];
                if (siteRule.partial) {
                    // If there's a partial string search as opposed to a domain search
                    if (tab.url.indexOf(siteRule.domain) !== -1) {
                        matchZoom = siteRule.zoom;
                        break;
                    }
                } else if (siteRule.regexp) {
                    let regexp = new RegExp(siteRule.domain);
                    if (regexp.test(tab.url)) {
                        matchZoom = siteRule.zoom;
                        break;
                    }
                } else {
                    let currentHostname = (new window.URL(tab.url)).hostname.replace(/^www\./, '');
                    if (currentHostname == siteRule.domain) {
                        matchZoom = siteRule.zoom;
                        break;
                    }
                }

            }
            tabUrlZoomList[tab.id] = matchZoom;
        }

        let newZoom = tabUrlZoomList[tab.id] || extSettings.zoomLevel;
        browser.tabs.setZoom(tab.id, newZoom / 100);
    };

    const tabUpdateListener = function (tabId, info, tab) {
        /**
         * This gets called many times, but if I dont do it 
         * the zoom wont be applied on page load which means 
         * there's a couple of seconds in which the zoom will be 100%
         */
        if (extSettings.enabled) {
            /**
             * If theres a change in the tab url cleanup the saved value for that url
             */
            if (info.url) removeUrlZoomList(tabId);

            /**
             * Monitor which tabs have a complete status so any posterior zoom change
             * problably (I think, maybe, most likely) come from the user
             * so if the option of creating rules automaticly is enabled
             * create a new rule
             */
            if (extSettings.allowAutoRule) {
                if (tab.status === 'complete')
                {
                    if(typeof tabCompleteList[tabId] === 'undefined'){
                        tabCompleteList[tabId] = {};
                        tabCompleteList[tabId].url = tab.url;
                        tabCompleteList[tabId].id = tab.id;
                        changeZoomInSingleTab(tab);    
                    }                    
                } else {
                    tabCompleteList[tabId] = undefined;
                    changeZoomInSingleTab(tab);
                }
            }           
            
        }
    };

    /**
     * After the settings have been load, update the tabs zoom
     */
    const enableSettings = function () {
        if (extSettings.enabled) {
            changeZoomInAllTabs();
        }
        
        if(browser.commands.onCommand.hasListener(handleCommandsListener)){
            if (!extSettings.enabled) {
                browser.commands.onCommand.removeListener(handleCommandsListener);
            }
        } else {
            browser.commands.onCommand.addListener(handleCommandsListener);
        }

        if (browser.tabs.onUpdated.hasListener(tabUpdateListener)) {
            if (!extSettings.enabled) {
                // actually remove the listener to remove any overhead
                browser.tabs.onUpdated.removeListener(tabUpdateListener);

            }
        } else {
            if (extSettings.enabled) {
                browser.tabs.onUpdated.addListener(tabUpdateListener);
            }
        }

        setZoomChangeHandlers();
    };

    /**
     * Listen to the browser events for zoom in order to create rules
     * when it happens
     */
    const setZoomChangeHandlers = function () {
        if (browser.tabs.onZoomChange.hasListener(handleZoomed)) {
            if (!extSettings.enabled || !extSettings.allowAutoRule) {
                browser.tabs.onZoomChange.removeListener(handleZoomed);
            }
        } else {
            if (extSettings.enabled && extSettings.allowAutoRule) {
                browser.tabs.onZoomChange.addListener(handleZoomed);
            }
        }
    };

    /**
     * Restores the default browser zoom 100%
     */
    const restoreDefaultZoom = function () {
        var querying = browser.tabs.query({});
        querying.then(function (tabs) {
            for (let tab of tabs) {
                browser.tabs.setZoom(tab.id, 1);
            }
        }, onError);
    };

    /**
     * Sends to the frontend the url of the current active tab in the current active window
     */
    const getCurrentUrl = function () {
        return new Promise((resolve) => {
            browser.tabs.query({
                    active: true,
                    windowId: browser.windows.WINDOW_ID_CURRENT
                })
                .then(tabs => browser.tabs.get(tabs[0].id))
                .then(tab => {
                    let url = tab.url;
                    let urlObj = new window.URL(url);
                    let validProtocol = urlObj.protocol && urlObj.protocol !== 'moz-extension:';

                    if (validProtocol) {
                        lastUsedUrl = tab.url;
                    }
                    resolve(lastUsedUrl);
                });
        });
    };

    /**
     * Adds a rule for a site
     * if it had a rule delete it frist
     * @param {*} newRule 
     */
    const saveCustomSiteRule = function (newRule) {
        return loadSettings().then(function () {
            let newSites = [];
            if (extSettings.sites.length) {
                newSites = extSettings.sites.filter(function (site) {
                    // the partial check it's because you could have the same string
                    // in a partial search and in a domain
                    if (site.domain != newRule.domain) {
                        return true;
                    } else {
                        let same = !!site.partial === !!newRule.partial && !!site.regexp === !!newRule.regexp;
                        return !same;
                    }
                });
            }
            newSites.push(newRule);
            extSettings.saveSitesStorage(newSites);
        });
    };

    /**
     * Deletes a site rule from the saved settings
     */
    const deleteCustomSiteRule = function (siteToDelete) {
        return loadSettings().then(function () {
            if (extSettings.sites.length) {
                let newSites = extSettings.sites.filter(function (site) {
                    if (site.domain != siteToDelete.domain) {
                        return true;
                    } else {
                        let same = !!site.partial === !!siteToDelete.partial && !!site.regexp === !!siteToDelete.regexp;
                        return !same;
                    }
                });
                extSettings.saveSitesStorage(newSites);
            }
        });
    };

    /**
     * Reload everything from local storage
     * and update the tab listeners
     */
    const loadEnableSettings = function () {
        loadSettings().then(function () {
            enableSettings();
        });
    };
    
    const handleCommandsListener = function(command) {
        if (command == "more-fixedzoom") {
            extSettings.saveZoomLevel(extSettings.zoomLevel + ZOOM_SHORTCUT_STEP).then(function () {
                changeZoomInAllTabs();
            });
        }else if (command == "less-fixedzoom") {
            extSettings.saveZoomLevel(extSettings.zoomLevel - ZOOM_SHORTCUT_STEP).then(function () {
                changeZoomInAllTabs();
            });
        }    
    }

    /**
     * Handles zoom events to create new rules automatically
     * @param {*} zoomChangeInfo 
     */
    function handleZoomed(zoomChangeInfo) {
        /**
         * Check that the zoom event comes from the active tab
         */
        browser.tabs.query({
            active: true,
            windowId: browser.windows.WINDOW_ID_CURRENT
        }).then(function (currentTab) {
            if (currentTab[0].id === zoomChangeInfo.tabId) {
                /**
                 * The settimeout its because firefox triggers multiple times the zoomhandler when the zoom 
                 * changes, say if I were to set it to 0.9 this is what happens SOMETIMES
                 * 0.9
                 * 1
                 * 0.9
                 */
                if (tabCompleteList[zoomChangeInfo.tabId]) {
                    let zoom = parseInt(zoomChangeInfo.newZoomFactor * 100);
                    let url = tabCompleteList[zoomChangeInfo.tabId].url;
                    let currentHostname = (new window.URL(url)).hostname.replace(/^www\./, '');

                    /**
                     * If the zoom level for the tab is different from the main zoom level create a rule
                     * otherwise delete the rule previously create if any
                     */
                    if (extSettings.zoomLevel !== zoom) {
                        saveCustomSiteRule({
                            zoom: zoom,
                            domain: currentHostname,
                            partial: false,
                            regexp: false
                        });
                    } else {
                        deleteCustomSiteRule({
                            domain: currentHostname,
                            partial: false,
                            regexp: false
                        });
                    }
                }
            }
        });
    }

    browser.runtime.onMessage.addListener((message) => {
        switch (message.method) {
            case "saveCustomSiteRule":
                /** Creates a rule */
                return saveCustomSiteRule(message.site).then(function () {
                    loadEnableSettings();
                });
            case "deleteCustomSiteRule":
                /** Deletes a rule */
                return deleteCustomSiteRule(message.site).then(function () {
                    loadEnableSettings();
                });
            case "getCurrentUrl":
                /** Returns the url of the site in tab where the popup is */
                return getCurrentUrl();
            case "restoreDefaultZoom":
                /** Restores the zoom to 100% in all active tabs */
                return restoreDefaultZoom();
            case "openSiteRulesManagement":
                /** Opens the rules management tab */
                return browser.tabs.create({
                    "url": "/management/management.html"
                });
            case "deleteAllRules":
                /** Deletes all the zoom rules created */
                return extSettings.deleteAllRules().then(function () {
                    changeZoomInAllTabs();
                });
            case "setAllowRegexp":
                /** Allow to create rules with regular expressions */
                return extSettings.saveAdvancedSetting('allowRegexp', message.value);
            case "setIconColor":
                /** Sets the color of the extension icon */
                return extSettings.saveAdvancedSetting('iconColor', message.value);
            case "setAllowProfiles":
                /** Enable or not zoom profiles */
                return extSettings.saveAdvancedSetting('allowProfiles', message.value).then(function () {
                    /** Allways set the default profile when enabling/disabling profiles */
                    return extSettings.changeProfile(DEFAULT_PROFILE);
                });
            case "setAllowAutoRule":
                /** Whether or not to create rules when the user uses ctr + - or alike*/
                return extSettings.saveAdvancedSetting('allowAutoRule', message.value).then(function () {
                    setZoomChangeHandlers();
                });
            case "setZoomLevel":
                /** Zoom level change, not the only case @see zoomFromShortcut */
                return extSettings.saveZoomLevel(message.value).then(function () {
                    enableSettings();
                });
            case "setEnabledStatus":
                /** Set whether or not the extension is nabled */
                return extSettings.saveEnabledStatus(message.value).then(function () {
                    enableSettings();
                });            
            case "getSetting":
                /** Sends to the frontend a saved setting */
                return new Promise((resolve) => {
                    return resolve(extSettings[message.value]);
                });
            case "getAllSettings":
                /** Sends to the frontend all the settings */
                return new Promise((resolve) => {
                    return resolve(extSettings);
                });
            case "createNewProfile":
                /** New zoom profile */
                return extSettings.createNewProfile(message.value);
            case "changeProfile":
                /** Change the current profile */
                return extSettings.changeProfile(message.value);
            case "deleteCurrentProfile":
                /** Delete the currently enabled profile */
                return new Promise((resolve) => {
                    resolve(extSettings.deleteProfile(extSettings.profile));
                });
            case "settingsSaved":
                /** Reload all the settings from the database (bad naming)  */
                return loadEnableSettings();
        }
    });
    
    /**
     * Entry point of the extension
     */
    if (!extSettings.scriptInitialized) {
        loadEnableSettings();
    }
})();