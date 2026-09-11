const registerForm = document.getElementById("register");
const backgroundNote = document.getElementById("background");
const errorEl = document.getElementById("error");
const noticeEl = document.getElementById("notice");

async function render() {
  const state = await window.vitarantracker.getState();
  if (!state.windowsOnly) {
    noticeEl.hidden = false;
    noticeEl.textContent =
      "This development session is not running on Windows. Production builds only support company-owned Windows laptops.";
  }
  if (state.registered) {
    registerForm.hidden = true;
    backgroundNote.hidden = false;
  } else {
    registerForm.hidden = false;
    backgroundNote.hidden = true;
    registerForm.backendUrl.value = state.backendUrl;
    registerForm.deviceName.placeholder = state.hostname;
  }
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  const data = new FormData(registerForm);
  try {
    await window.vitarantracker.register({
      backendUrl: String(data.get("backendUrl")),
      employeeId: String(data.get("employeeId")),
      registrationCode: String(data.get("registrationCode")),
      deviceName: String(data.get("deviceName")),
    });
    await render();
  } catch (error) {
    errorEl.textContent =
      error instanceof Error ? error.message : "Registration failed";
  }
});

window.vitarantracker.onStatus(() => {
  void render();
});

void render();
