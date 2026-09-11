const registerForm = document.getElementById("register");
const registeredView = document.getElementById("registered");
const errorEl = document.getElementById("error");
const noticeEl = document.getElementById("notice");
const statusEl = document.getElementById("status");

async function render() {
  const state = await window.vitarantracker.getState();
  if (!state.windowsOnly) {
    noticeEl.hidden = false;
    noticeEl.textContent =
      "This development session is not running on Windows. Production builds only support company-owned Windows laptops.";
  }
  if (state.registered) {
    registerForm.hidden = true;
    registeredView.hidden = false;
    document.getElementById("employeeId").textContent = state.employeeId;
    document.getElementById("deviceName").textContent = state.deviceName;
    document.getElementById("hostname").textContent = state.hostname;
    statusEl.textContent = state.status;
  } else {
    registerForm.hidden = false;
    registeredView.hidden = true;
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
    errorEl.textContent = error instanceof Error ? error.message : "Registration failed";
  }
});

document.getElementById("unregister").addEventListener("click", async () => {
  await window.vitarantracker.unregister();
  await render();
});

window.vitarantracker.onStatus((status) => {
  statusEl.textContent = status;
});

void render();
