// Fitxer: ../JS/alta-usuaris-crud.js

/**
 * Funció que crea l'element DOM per al CRUD d'Alta d'Usuaris.
 * @returns {HTMLElement} El div contenidor del CRUD.
 */
export function createAltaUsuarisCRUD() {
  // 1. Crear el contenidor principal del CRUD
  const crudContainer = document.createElement("div");
  crudContainer.className = "crud-container";

  // 2. Definir l'HTML del CRUD amb l'estructura de FLOATING LABEL
  crudContainer.innerHTML = `
        <h3 class="crud-title">✅ Alta de Nou Usuari</h3>
        <form id="altaUsuariForm" class="crud-form">
            
            <div class="input-group">
                <input type="text" id="adminNom" name="nom" placeholder=" " required>
                <label for="adminNom" class="floating-label">Nom Complet:</label>
            </div>
            
            <div class="input-group">
                <input type="email" id="adminEmail" name="email" placeholder=" " required>
                <label for="adminEmail" class="floating-label">Correu Electrònic:</label>
            </div>
            
            <button type="submit" id="adminAltaButton">
                Crear Usuari i Enviar Correu
            </button>
        </form>
        
        <p id="adminMissatgeEstat" class="status-message"></p>
    `;

  // 3. Afegir la lògica del formulari
  const form = crudContainer.querySelector("#altaUsuariForm");
  const missatgeEstat = crudContainer.querySelector("#adminMissatgeEstat");
  const altaButton = crudContainer.querySelector("#adminAltaButton");

  // ATENCIÓ: Aquí s'injecta la lògica de SIMULACIÓ
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nom = crudContainer.querySelector("#adminNom").value.trim();
    const email = crudContainer.querySelector("#adminEmail").value.trim();
    // Obtenim la URL globalment definida a main.js
    const altaFunctionUrl = window.ALTA_USUARIS_FUNCTION_URL;

    if (!altaFunctionUrl) {
      missatgeEstat.textContent =
        "❌ Error intern: URL de l'API d'alta no trobada.";
      missatgeEstat.className = "status-message error";
      console.error(
        "URL de l'Edge Function 'api-alta' no definida. Cal revisar main.js."
      );
      return;
    }

    if (!nom || !email) {
      missatgeEstat.textContent =
        "❌ Cal omplir el nom complet i el correu electrònic.";
      missatgeEstat.className = "status-message error";
      return;
    }

    altaButton.disabled = true;
    altaButton.textContent = "Processant... ⏳";
    // ⚠️ CANVIEM el missatge per veure que estem al codi nou
    missatgeEstat.textContent = "Cridant Edge Function per enviar invitació...";
    missatgeEstat.className = "status-message info";

    try {
      // Crida a la Edge Function (Edge Function)
      const response = await fetch(altaFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          nom: nom,
        }),
      });

      const result = await response.json();

      if (response.ok && !result.error) {
        // Èxit
        missatgeEstat.textContent = `✅ Usuari pendent de confirmació. Correu de validació enviat a: ${email}.`;
        missatgeEstat.className = "status-message success";
        form.reset();
      } else {
        // Error
        const errorMessage =
          result.error_description ||
          result.error ||
          "Error desconegut al crear l'usuari.";
        missatgeEstat.textContent = `❌ Error: ${errorMessage}`;
        missatgeEstat.className = "status-message error";
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      missatgeEstat.textContent =
        "❌ Error de connexió amb el servidor d'alta d'usuari (Edge Function).";
      missatgeEstat.className = "status-message error";
    } finally {
      // Finalment, restaurar el botó
      altaButton.disabled = false;
      altaButton.textContent = "Crear Usuari i Enviar Correu";
    }
  }); // ⬅️ Tanca l'addEventListener

  return crudContainer;
}