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
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nom = crudContainer.querySelector("#adminNom").value.trim();
    const email = crudContainer.querySelector("#adminEmail").value.trim();

    altaButton.disabled = true;
    altaButton.textContent = "Processant... ⏳";
    missatgeEstat.textContent = "Simulant crida a Edge Function...";
    missatgeEstat.className = "status-message info";

    // SIMULACIÓ DEL FLUX DE SUPABASE / EDGE FUNCTION
    setTimeout(() => {
      if (nom && email) {
        missatgeEstat.textContent = `✅ Usuari creat (PENDENT). Correu enviat (simulat) a: ${email}.`;
        missatgeEstat.className = "status-message success";
        form.reset();
      } else {
        missatgeEstat.textContent = "❌ Cal omplir nom i correu electrònic.";
        missatgeEstat.className = "status-message error";
      }
      altaButton.disabled = false;
      altaButton.textContent = "Crear Usuari i Enviar Correu";
    }, 1500);
  });

  return crudContainer;
}
