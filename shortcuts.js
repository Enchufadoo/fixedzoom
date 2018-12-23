(function () {
  const PLUS_SIGN = 107;
  const MINUS_SIGN = 109;
  const MORE_ZOOM_CONSTANT = "MORE_ZOOM";
  const LESS_ZOOM_CONSTANT = "LESS_ZOOM";

  const GET_SHORTCUTS_ENABLED = "getShortcutsEnabled";
  const REFRESH_SHORTCUTS_ENABLED = "refreshShortcutsEnabled";
  /**
   * When ctrl alt + / - gets pressed request a zoom change
   * to the background script
   * @param {*} event 
   */
  const keyHandler = function (event) {
    console.log(event.key)
    if (event.ctrlKey && event.altKey) {
      if ((event.keyCode == PLUS_SIGN) || (event.key === '+')) {
        browser.runtime.sendMessage({
          method: "zoomFromShortcut",
          zoomChange: MORE_ZOOM_CONSTANT
        });
      } else if ((event.keyCode == MINUS_SIGN) || (event.key === '-')) {
        browser.runtime.sendMessage({
          method: "zoomFromShortcut",
          zoomChange: LESS_ZOOM_CONSTANT
        });
      }
    }
  }
  /**
   * Add or remove the zoom handler based on the config
   */
  const getShortcutsEnabled = function () {
    browser.runtime.sendMessage({
      method: GET_SHORTCUTS_ENABLED,
    }).then(function (enabled) {
      if (enabled) {
        document.addEventListener('keyup', keyHandler, false);
      } else {
        document.removeEventListener('keyup', keyHandler, false)
      }
    });
  }
  /**
   * If the setting is changed, refresh the handler on active tabs
   */
  browser.runtime.onMessage.addListener((data, sender) => {
    if (data.message == REFRESH_SHORTCUTS_ENABLED) {
      getShortcutsEnabled();
    }
  });

  getShortcutsEnabled();
}());