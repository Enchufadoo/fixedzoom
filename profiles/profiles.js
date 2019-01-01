let profileNameInput = document.querySelector("#profileNameInput");
let createProfileButton = document.querySelector("#createProfileButton");

window.onload = function () {
  profileNameInput.focus();
  validateInput();
};

/**
 * Check if the profile name is not empty
 * @param {*} event 
 */
const validateInput = function () {
  let val = profileNameInput.value.trim();
  if (val === "") {
    createProfileButton.classList.add('disabledOption');
  } else {
    createProfileButton.classList.remove('disabledOption');
  }
};

/**
 * Sends the new profile name to the backend
 * @param {*} event 
 */
const createProfile = function (event) {
  /**
   * If I dont stop the event I get this
   * "Promise resolved while context is inactive"
   * Totally out of my depth 
   **/
  event.preventDefault();
  event.stopPropagation();

  let val = profileNameInput.value.trim();
  browser.runtime.sendMessage({
    method: "createNewProfile",
    value: val
  }).then(() => {
    window.location = "../options/options.html";
  });
};

createProfileButton.addEventListener('click', createProfile);
profileNameInput.addEventListener('change', validateInput);
profileNameInput.addEventListener('input', validateInput);