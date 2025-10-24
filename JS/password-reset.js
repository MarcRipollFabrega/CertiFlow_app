// Fitxer: ../JS/password-reset.js

/**
 * Funció que crea la interfície per establir la contrasenya inicial.
 * Aquesta funció es crida si un usuari loguejat (amb sessió, per exemple, després d'una invitació)
 * no ha configurat prèviament la seva contrasenya.
 * * @param {object} supabaseClient - El client de Supabase inicialitzat.
 * @param {function} loadAppDashboard - Funció per carregar l'aplicació principal després de l'èxit.
 * @returns {HTMLElement} El div contenidor del formulari de contrasenya.
 */
export function createPasswordSetupForm(supabaseClient, loadAppDashboard) {
  const container = document.createElement("div");
  // Utilitzem classes de l'estructura del teu login (per exemple, si el teu dashboard.html té un contenidor principal amb flex)
  container.className = "login-container";

  container.innerHTML = `
        <div class="login-right" style="flex: 10;"> 
            <div class="login-form-wrapper">
                <h1 class="login-title">🔒 Estableix la Teva Contrasenya</h1>
                <p class="login-subtitle">Ja has confirmat el teu accés. Crea la teva contrasenya per finalitzar l'activació.</p>

                <form id="passwordSetupForm" class="login-form">
                    <div class="input-group">
                        <input type="password" id="newPassword" placeholder=" " required minlength="6">
                        <label for="newPassword" class="floating-label">Nova Contrasenya:</label>
                    </div>
                    <div class="input-group">
                        <input type="password" id="confirmPassword" placeholder=" " required minlength="6">
                        <label for="confirmPassword" class="floating-label">Confirma Contrasenya:</label>
                    </div>
                    
                    <button type="submit" id="setPasswordButton">
                        Establir Contrasenya
                    </button>
                    <p id="passwordStatusMessage" class="status-message"></p>
                </form>
            </div>
        </div>
    `;

  const form = container.querySelector("#passwordSetupForm");
  const newPasswordInput = container.querySelector("#newPassword");
  const confirmPasswordInput = container.querySelector("#confirmPassword");
  const statusMessage = container.querySelector("#passwordStatusMessage");
  const setPasswordButton = container.querySelector("#setPasswordButton");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setPasswordButton.disabled = true;
    setPasswordButton.textContent = "Guardant... ⏳";
    statusMessage.textContent = "";
    statusMessage.className = "status-message";

    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (newPassword !== confirmPassword) {
      statusMessage.textContent = "❌ Les contrasenyes no coincideixen.";
      statusMessage.className = "status-message error";
      setPasswordButton.disabled = false;
      setPasswordButton.textContent = "Establir Contrasenya";
      return;
    }

    try {
      // Pas 4: Actualitzar la contrasenya i marcar l'usuari com a 'configurat'
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
        data: {
          initial_setup: true, // Marcar que la contrasenya ja ha estat establerta
        },
      });

      if (error) {
        console.error("Error al guardar contrasenya:", error);
        statusMessage.textContent = `❌ Error al guardar contrasenya: ${error.message}`;
        statusMessage.className = "status-message error";
      } else {
        // ÉXIT
        statusMessage.textContent =
          "✅ Contrasenya establerta amb èxit! Carregant aplicació...";
        statusMessage.className = "status-message success";
        form.reset();

        // Un petit retard per mostrar el missatge d'èxit abans de carregar el dashboard
        setTimeout(() => {
          loadAppDashboard();
        }, 1500);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      statusMessage.textContent = "❌ Error de connexió.";
      statusMessage.className = "status-message error";
    } finally {
      setPasswordButton.disabled = false;
      setPasswordButton.textContent = "Establir Contrasenya";
    }
  });

  return container;
}
