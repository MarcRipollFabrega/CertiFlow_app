// Fitxer: ../JS/altaUsuari.js (Versió amb dos SELECTS)

/**
 * Funció que crea l'element DOM per al CRUD d'Alta d'Usuaris.
 * @param {function} loadRolesFunction - Funció asíncrona per carregar els rols.
 * @param {function} loadDepartamentsFunction - Funció asíncrona per carregar els departaments.
 * @returns {HTMLElement} El div contenidor del CRUD.
 */
export function createAltaUsuarisCRUD(
  loadRolesFunction,
  loadDepartamentsFunction // ✅ NOU PARÀMETRE INCORPORAT
) {
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
            
            <div class="input-group">
                <select id="adminRole" name="role" required>
                    <option value="" disabled selected>Carregant Rols...</option>
                </select>
            </div>
            
            <div class="input-group">
                <select id="adminDepartament" name="nom_departament" required>
                    <option value="" disabled selected>Carregant Departaments...</option>
                </select>
            </div>
            
            <div id="status-message" class="status-message"></div>
            
            <button type="submit" id="altaUsuariButton">
                Donar d'Alta
            </button>
            
            </form>
        
        <p id="adminMissatgeEstat" class="status-message"></p>
    `;

  // 3. Referències i Lògica del Formulari
  const form = crudContainer.querySelector("#altaUsuariForm");
  const roleSelect = crudContainer.querySelector("#adminRole");
  const departamentSelect = crudContainer.querySelector("#adminDepartament"); // ✅ Referència al nou SELECT
  const altaButton = crudContainer.querySelector("#adminAltaButton");
  const missatgeEstat = crudContainer.querySelector("#adminMissatgeEstat");

  // Wrapper per carregar els rols i forçar la selecció de 'Tècnic' per defecte
  const wrappedLoadRoles = async (selectElement) => {
    // 1. Crida a la funció de càrrega real (definida a dashboard.js)
    await loadRolesFunction(selectElement);

    // 2. Lògica de selecció per defecte
    const targetRole = "Tècnic";
    const options = Array.from(selectElement.options);

    options.forEach((opt) => (opt.selected = false));

    const tecnicOption = options.find((opt) => opt.textContent === targetRole);

    if (tecnicOption) {
      tecnicOption.selected = true;
    } else {
      selectElement.value = "";
      const placeholder = selectElement.querySelector("option[disabled]");
      if (placeholder) placeholder.selected = true;
    }
  };

  // --- Inicialització de Rols ---
  if (loadRolesFunction) {
    wrappedLoadRoles(roleSelect);
  }

  // --- Inicialització de Departaments ---
  if (loadDepartamentsFunction) {
    loadDepartamentsFunction(departamentSelect); // ✅ Crida a la càrrega de departaments
  }

  // Lògica de Submissió del Formulari (Actualitzada per als dos SELECTS)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nom = crudContainer.querySelector("#adminNom").value.trim();
    const email = crudContainer.querySelector("#adminEmail").value.trim();
    const role = roleSelect.value.trim();
    const nom_departament = departamentSelect.value.trim(); // ✅ Lectura del nou SELECT

    const altaFunctionUrl = window.ALTA_USUARIS_FUNCTION_URL;

    if (!altaFunctionUrl || !nom || !email || !role || !nom_departament) {
      missatgeEstat.textContent =
        "❌ Cal omplir tots els camps i seleccionar un rol i un departament.";
      missatgeEstat.className = "status-message error";
      return;
    }

    // ... (Codi de gestió de l'estat i crida a la Edge Function) ...
    altaButton.disabled = true;
    altaButton.textContent = "Processant... ⏳";
    missatgeEstat.textContent = "Cridant Edge Function per enviar invitació...";
    missatgeEstat.className = "status-message info";

    try {
      const response = await fetch(altaFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          nom: nom,
          role: role,
          nom_departament: nom_departament, // ✅ ENVIAMENT A LA EDGE FUNCTION
        }),
      });

      const result = await response.json();

      if (response.ok && !result.error) {
        missatgeEstat.textContent = `✅ Usuari pendent de confirmació. Correu de validació enviat a: ${email}.`;
        missatgeEstat.className = "status-message success";
        form.reset();

        if (loadRolesFunction) wrappedLoadRoles(roleSelect); // Restableix i selecciona 'Tècnic'
        if (loadDepartamentsFunction)
          loadDepartamentsFunction(departamentSelect); // ✅ Recarrega departaments
      } else {
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
      altaButton.disabled = false;
      altaButton.textContent = "Crear Usuari i Enviar Correu";
    }
  });

  return crudContainer;
}
