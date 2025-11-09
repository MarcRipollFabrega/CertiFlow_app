/***********************************************************************************************************************************/
// ARXIU PER GESTIONAR EL FLUX DE 'SET PASSWORD' AMB SUPABASE AUTH
/***********************************************************************************************************************************/

/**
  * Inicialitza el mode de configuració de contrasenya segura si es detecta un token a la URL.
 * @param {object} supabaseClient 
 * @returns {boolean} 
 */
// Funció d'inicialització que es crida des de main.js
export function initializePasswordSetup(supabaseClient) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const email = urlParams.get("email");
  const isPasswordSetupMode = token && email;

// Elements del DOM
  const loginView = document.getElementById("loginView");
  const setPasswordContainer = document.getElementById("setPasswordContainer");
  const setPasswordForm = document.getElementById("setPasswordForm");
  const setPasswordButton = document.getElementById("setPasswordButton");
  const passwordMessage = document.getElementById("passwordMessage");

// Si no estem en mode de configuració de contrasenya, sortim
  if (!isPasswordSetupMode) {
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return false;
  }
  console.log("Mode: Establir Contrasenya Segura detectat. Iniciant gestió...");

// Mostrar el formulari de configuració de contrasenya i amagar el login
  if (loginView) loginView.style.display = "none";
  if (setPasswordContainer) setPasswordContainer.style.display = "block";

// Preparar el botó i el missatge
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
 // Assignar l'esdeveniment de submissió del formulari
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
// Netejar la URL per eliminar el token i l'email
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

// Funció per gestionar l'establiment de la contrasenya
async function handleSetPassword(
  e,
  supabaseClient,
  token,
  email,
  passwordMessage,
  setPasswordButton
) {
  e.preventDefault();
// Obtenir els valors dels camps de contrasenya
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
// Validar les contrasenyes
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;
// Validacions bàsiques
  if (newPassword.length < 6) {
    passwordMessage.textContent =
      "La contrasenya ha de tenir almenys 6 caràcters.";
    return;
  }
// Comprovar que les contrasenyes coincideixen
  if (newPassword !== confirmNewPassword) {
    passwordMessage.textContent = "Les contrasenyes no coincideixen.";
    return;
  }
// Iniciar el procés d'establiment de contrasenya
  passwordMessage.textContent = "";
  setPasswordButton.disabled = true;
  setPasswordButton.textContent = "Verificant i Guardant...";

// 1. DETERMINAR EL TIPUS DE FLUX (INVITACIÓ O RECUPERACIÓ)
  const urlParams = new URLSearchParams(window.location.search);
  const flowType = urlParams.get("flow");
// Definir el tipus de verificació basat en el flux
  const verificationType = flowType === "recovery" ? "recovery" : "invite";

 // 2. VERIFICAR EL TOKEN I INICIAR SESSIÓ TEMPORAL
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

// 3. ACTUALITZAR LA CONTRASENYA DE L'USUARI
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

// 4. ÈXIT: CONTRASENYA ESTABLERTA
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
// Animació de desaparició després de 4 segons
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
// Redirigir o recarregar després d'uns segons
  setTimeout(() => {
    window.location.reload();
  }, 3000);
}
