/**
 * Crea el CRUD per donar d'alta nous usuaris amb selecció de rols i departaments.
 * @param {function} loadRolesFunction 
 * @param {function} loadDepartamentsFunction 
 * @returns {HTMLElement} 
 */
/* Exportar la funció createAltaUsuarisCRUD*/
export function createAltaUsuarisCRUD(
  loadRolesFunction,
  loadDepartamentsFunction 
) {
  // Crear el contenidor principal del CRUD
  const crudContainer = document.createElement("div");
  crudContainer.className = "crud-container";

  // Afegir el contingut HTML del formulari d'alta d'usuari
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

  // Referències als elements del formulari
  const form = crudContainer.querySelector("#altaUsuariForm");
  const roleSelect = crudContainer.querySelector("#adminRole");
  const departamentSelect = crudContainer.querySelector("#adminDepartament"); 
  const altaButton = crudContainer.querySelector("#altaUsuariButton");
  const missatgeEstat = crudContainer.querySelector("#adminMissatgeEstat");

 // Funció per carregar rols i seleccionar "Tècnic" per defecte
  const wrappedLoadRoles = async (selectElement) => {
    // Carregar els rols
    await loadRolesFunction(selectElement);
    // Seleccionar "Tècnic" per defecte
    const targetRole = "Tècnic";
    const options = Array.from(selectElement.options);
    options.forEach((opt) => (opt.selected = false));
    const tecnicOption = options.find((opt) => opt.textContent === targetRole);
// Si es troba, seleccionar-lo; si no, deixar el SELECT en blanc
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
    loadDepartamentsFunction(departamentSelect); 
  }

 // Gestió de l'esdeveniment de submissió del formulari
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
// Obtenir els valors dels camps del formulari
    const nom = crudContainer.querySelector("#adminNom").value.trim();
    const email = crudContainer.querySelector("#adminEmail").value.trim();
    const role = roleSelect.value.trim();
    const nom_departament = departamentSelect.value.trim(); 
    const altaFunctionUrl = window.ALTA_USUARIS_FUNCTION_URL;
// Validar que tots els camps estan omplerts
    if (!altaFunctionUrl || !nom || !email || !role || !nom_departament) {
      missatgeEstat.textContent =
        "❌ Cal omplir tots els camps i seleccionar un rol i un departament.";
      missatgeEstat.className = "status-message error";
      return;
    }

   // Desactivar el botó i mostrar missatge de procés
    altaButton.disabled = true;
    altaButton.textContent = "Processant... ⏳";
    missatgeEstat.textContent = "Cridant Edge Function per enviar invitació...";
    missatgeEstat.className = "status-message info";
// Cridar l'Edge Function per donar d'alta l'usuari
    try {
      const response = await fetch(altaFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          nom: nom,
          role: role,
          nom_departament: nom_departament, 
        }),
      });
      const result = await response.json();
// Gestionar la resposta de l'Edge Function
      if (response.ok && !result.error) {
        missatgeEstat.textContent = `✅ Usuari pendent de confirmació. Correu de validació enviat a: ${email}.`;
        missatgeEstat.className = "status-message success";
        form.reset();
// Restablir seleccions de Rols i Departaments
        if (loadRolesFunction) wrappedLoadRoles(roleSelect); // Restableix i selecciona 'Tècnic'
        if (loadDepartamentsFunction)
          loadDepartamentsFunction(departamentSelect); 
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
      altaButton.textContent = "Donar d'Alta";
    }
  });

  return crudContainer;
}
