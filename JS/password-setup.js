// JS/password-setup.js

/**
 * Funció que detecta si la URL conté els paràmetres de token i email
 * per al nou flux de 'Set Password' (Invita o Reset).
 * @param {object} supabaseClient - Instància del client Supabase.
 * @returns {boolean} True si s'està en mode Set Password, False en cas contrari.
 */
export function initializePasswordSetup(supabaseClient) {
  // Utilitza URLSearchParams per llegir paràmetres de consulta (?token=...)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const email = urlParams.get("email");

  // Si no hi ha 'token' a la URL, no estem en el mode de contrasenya segura.
  const isPasswordSetupMode = token && email;

  // ELEMENTS DEL DOM DE SET PASSWORD
  const loginView = document.getElementById("loginView");
  const setPasswordContainer = document.getElementById("setPasswordContainer");
  const setPasswordForm = document.getElementById("setPasswordForm");
  const setPasswordButton = document.getElementById("setPasswordButton");
  const passwordMessage = document.getElementById("passwordMessage");

  if (!isPasswordSetupMode) {
    // Netejar qualsevol hash antic que pugui haver quedat a la URL
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return false;
  }

  console.log("Mode: Establir Contrasenya Segura detectat. Iniciant gestió...");

  // Ocultar vista de Login i mostrar vista de Set Password
  if (loginView) loginView.style.display = "none";
  if (setPasswordContainer) setPasswordContainer.style.display = "block";

  // Missatge a l'usuari
  if (setPasswordButton) {
    setPasswordButton.disabled = false;
    setPasswordButton.textContent = "Guardar Contrasenya";
    passwordMessage.textContent = "";
    console.log("Formulari de contrasenya llest per a la interacció.");
  }

  if (!setPasswordForm) {
    console.error("No es troba el formulari 'setPasswordForm'.");
    return true;
  }

  // AFEGIM EL LISTENER: Es passa el token i l'email com a dades fixes.
  setPasswordForm.addEventListener("submit", (e) =>
    handleSetPassword(
      e,
      supabaseClient,
      token,
      email,
      passwordMessage,
      setPasswordButton
    )
  );

  // Important: Netejar els paràmetres de la URL després de llegir-los per seguretat.
  window.history.replaceState({}, document.title, window.location.pathname);

  return true;
}

// --- FUNCIÓ PRINCIPAL DE PROCESSAMENT (Executada amb el clic del botó) ---
async function handleSetPassword(
  e,
  supabaseClient,
  token,
  email,
  passwordMessage,
  setPasswordButton
) {
  e.preventDefault();

  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  if (newPassword.length < 6) {
    passwordMessage.textContent =
      "La contrasenya ha de tenir almenys 6 caràcters.";
    return;
  }

  if (newPassword !== confirmNewPassword) {
    passwordMessage.textContent = "Les contrasenyes no coincideixen.";
    return;
  }

  passwordMessage.textContent = "";
  setPasswordButton.disabled = true;
  setPasswordButton.textContent = "Verificant i Guardant...";

  // 1. NOU PAS CRÍTIC: DETERMINAR EL TIPUS DE FLUX
  const urlParams = new URLSearchParams(window.location.search);
  const flowType = urlParams.get("flow");

  // Si 'flow' és 'recovery', usem 'recovery'. Altrament, assumim 'invite' (el més segur).
  const verificationType = flowType === "recovery" ? "recovery" : "invite";

  // 2. VERIFICAR L'OTP I ESTABLIR LA SESSIÓ (Aquest pas consumeix el token)
  const {
    data: { session: verifiedSession },
    error: verifyError,
  } = await supabaseClient.auth.verifyOtp({
    email: email,
    token: token,
    type: verificationType, // <-- ÚS DEL TIPUS DINÀMIC
  });

  if (verifyError) {
    console.error(
      "Error de verificació/inici de sessió (token):",
      verifyError.message
    );
    let errorMessage =
      "Error: L'enllaç ha caducat, ja s'ha utilitzat, o és invàlid. Sol·licita un de nou.";

    passwordMessage.textContent = errorMessage;
    setPasswordButton.disabled = false;
    setPasswordButton.textContent = "Guardar Contrasenya";
    return;
  }

  // 3. ACTUALITZAR LA CONTRASENYA (L'usuari ja té una sessió temporal vàlida)
  const { data, error: updateError } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error("Error al canviar la contrasenya:", updateError.message);
    passwordMessage.textContent =
      "Error: No s'ha pogut canviar la contrasenya. Intenta-ho de nou.";
    setPasswordButton.disabled = false;
    setPasswordButton.textContent = "Guardar Contrasenya";
    return;
  }

  // Funció auxiliar per mostrar Toast (mantenida per compatibilitat)
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }, 4000);
  }

  showToast(
    "Contrasenya establerta correctament! Tornant a la pàgina de login...",
    "success"
  );

  setTimeout(() => {
    // Recarregar per mostrar la vista de login neta
    window.location.reload();
  }, 3000);
}
