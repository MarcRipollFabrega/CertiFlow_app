/*=======================================================
  JS/llistaUsuaris.js 
*/
// =======================================================
// 1. FUNCIÓ PRINCIPAL EXPORTADA
// =======================================================

/**
 * Funció que crea l'element DOM de la taula de llistat d'Usuaris.
 * @param {function} loadUsuarisFunction - Funció asíncrona per carregar les dades dels usuaris.
 * @param {Array<string>} roles - Array amb tots els noms de rols disponibles.
 * @param {Array<string>} departaments - Array amb tots els noms de departaments disponibles.
 * @param {function} onSaveFunction - Funció asíncrona per guardar els canvis a Supabase.
 * @param {function} onReloadFunction - Funció per recarregar el component admin després de guardar.
 * @param {function} onDeleteFunction - 🚨 NOU: Funció asíncrona per eliminar un usuari de Supabase.
 * @returns {HTMLElement} El div contenidor amb la taula.
 */
export function createLlistaUsuarisTable(
  loadUsuarisFunction,
  roles,
  departaments,
  onSaveFunction,
  onReloadFunction,
  onDeleteFunction 
) {
  const tableContainer = document.createElement("div");
  tableContainer.className = "llista-usuaris-container";

// Afegir el contingut HTML inicial
  tableContainer.innerHTML = `
        <h3 class="crud-title">Llistat d'Usuaris</h3>
        <div class="filters-container">
            <input type="text" id="userSearchInput" placeholder="Cerca per nom, email, rol o departament..." class="search-input">
        </div>
        <div id="llistaUsuarisContent" class="table-responsive">
            <p>Carregant dades...</p>
        </div>
        <p id="llistaUsuarisEstat" class="status-message"></p>
    `;

  const contentDiv = tableContainer.querySelector("#llistaUsuarisContent");
  const statusMessage = tableContainer.querySelector("#llistaUsuarisEstat");

// 💡 HELPER: Funció per crear un SELECT amb opcions
  const createSelectHTML = (fieldName, optionsArray, currentValue) => {
    let optionsHTML = optionsArray
      .map(
        (option) =>
          `<option value="${option}" ${
            option === currentValue ? "selected" : ""
          }>${option}</option>`
      )
      .join("");
    return `<select data-field="${fieldName}" class="edit-select">${optionsHTML}</select>`;
  };

  // 💡 HELPER: Funció per estandarditzar noms (per classes CSS)
  const standardizeName = (name) => {
    if (!name) return "";
    // 1. Convertir a minúscules
    let standardized = name.toLowerCase();

    // 2. Eliminar accents
    standardized = standardized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

   // 3. Substituir espais per guions
    return standardized.replace(/\s+/g, "-");
  };

  // =======================================================
  // 1. LÒGICA DE CERCA AMB DEBOUNCE
  // =======================================================
  let currentSearchTerm = "";
  const handleSearch = (searchTerm) => {
    // 1. Netejar i estandarditzar el terme de cerca
    const term = searchTerm.trim().toLowerCase();
    // 2. Evitar recarregar si el terme no ha canviat
    if (term === currentSearchTerm) return;
    currentSearchTerm = term;
    
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    window.searchTimeout = setTimeout(() => {
      renderTable(currentSearchTerm);
    }, 300);
  };

 // =======================================================
  // 2. LÒGICA DE RENDERITZACIÓ DE LA TAULA
  // =======================================================
  const renderTable = async (searchTerm = "") => {
    contentDiv.innerHTML =
      '<p class="status-message info">Carregant d\'usuaris... ⏳</p>';
    statusMessage.textContent = "Carregant dades...";
    try {
      const usuaris = await loadUsuarisFunction(searchTerm); 
// Crida a la funció passada com a paràmetre
      if (!usuaris || usuaris.length === 0) {
        contentDiv.innerHTML =
          '<p class="status-message info">No s\'han trobat usuaris.</p>';
        return;
      }
      const tableHTML = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th class="rol-color">Rol</th>
                            <th>Departament</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuaris
                          .map((user) => {
                            // 1. Estandardització del Rol
                            const rolClass = standardizeName(user.role);
                            // 2. Estandardització del Departament
                            const dptClass = standardizeName(
                              user.nom_departament
                            );
                            return `
                                    <tr data-original-email="${user.email}">
                                        <td>${user.nom}</td> 
                                        <td>${user.email}</td>
                                        
                                        <td class="role-cell rol-${rolClass}">
                                            <span class="role-badge">${user.role}</span>
                                        </td>
                                        
                                        <td class="dpt-cell dpt-${dptClass}">
                                            <span class="dpt-badge">${user.nom_departament}</span>
                                        </td>
                                        
                                        <td>
                                            <button class="action-btn edit-btn" data-email="${user.email}">📝 Editar</button>
                                            <button class="action-btn delete-btn" data-email="${user.email}">🗑️ Eliminar</button> 
                                        </td>
                                    </tr>
                                `;
                          })
                          .join("")}
                    </tbody>
                </table>
            `;

      contentDiv.innerHTML = tableHTML;
      statusMessage.textContent = `✅ S'han carregat ${usuaris.length} usuaris.`;
      statusMessage.className = "status-message success";

      // Afegir listener per als botons EDIT
      const editButtons = tableContainer.querySelectorAll(
        ".action-btn.edit-btn"
      );
      editButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const email = e.target.dataset.email;
          toggleEditMode(e.target, email);
        });
      });

      // Afegir listener per als botons DELETE
      const deleteButtons = tableContainer.querySelectorAll(
        ".action-btn.delete-btn"
      );
      deleteButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const email = e.target.dataset.email;
          handleDelete(email);
        });
      });
    } catch (error) {
      console.error("Error al renderitzar la taula d'usuaris:", error);
      contentDiv.innerHTML =
        '<p class="status-message error">❌ Error fatal al carregar el llistat.</p>';
    }
  };

  // =======================================================
  // 3. LÒGICA D'ELIMINACIÓ D'USUARI
  // =======================================================

  const handleDelete = async (email) => {
    const confirmation = confirm(
      `Estàs segur que vols eliminar l'usuari amb email: ${email}? Aquesta acció no es pot desfer.`
    );

    if (!confirmation) {
      return;
    }

    const deleteButton = tableContainer.querySelector(
      `.action-btn.delete-btn[data-email="${email}"]`
    );
    if (deleteButton) {
      deleteButton.textContent = "Eliminant...";
      deleteButton.disabled = true;
    }

    try {
      const success = await onDeleteFunction(email);

      if (success) {
        alert(`✅ Usuari ${email} eliminat correctament!`);
        onReloadFunction();
      } else {
        alert(
          "❌ Error a l'eliminar. Potser no tens permisos (RLS) o hi ha un error de connexió."
        );
        if (deleteButton) {
          deleteButton.textContent = "🗑️ Eliminar";
          deleteButton.disabled = false;
        }
      }
    } catch (error) {
      console.error("Error durant el procés d'eliminació:", error);
      alert("❌ Error intern durant l'eliminació.");
      if (deleteButton) {
        deleteButton.textContent = "🗑️ Eliminar";
        deleteButton.disabled = false;
      }
    }
  };

  // =======================================================
  // 4. LÒGICA D'EDICIÓ D'USUARI
  // =======================================================

  const toggleEditMode = (button, email) => {
    const row = button.closest("tr");
    const isEditing = row.classList.contains("editing");
    const cells = row.querySelectorAll("td");
// Si ja està en mode edició, no fer res
    if (!isEditing) {
      row.classList.add("editing");
      const currentRoleText = cells[2].querySelector(".role-badge").textContent;
      const currentDptText = cells[3].querySelector(".dpt-badge").textContent;
      row.dataset.originalName = cells[0].textContent;
      row.dataset.originalEmail = cells[1].textContent;
      row.dataset.originalRole = currentRoleText;
      row.dataset.originalDpt = currentDptText;
      cells[0].innerHTML = `<input type="text" data-field="nom" value="${row.dataset.originalName}" class="edit-input-text" required>`;
      cells[1].innerHTML = `<input type="email" data-field="email" value="${row.dataset.originalEmail}" class="edit-input-text" required>`;
      cells[2].innerHTML = createSelectHTML("role", roles, currentRoleText);
      cells[3].innerHTML = createSelectHTML(
        "nom_departament",
        departaments,
        row.dataset.originalDpt
      );
      cells[4].innerHTML = `
        <button class="action-btn save-btn">💾 Guardar</button>
        <button class="action-btn cancel-btn">❌ Cancel·lar</button>
      `;
      cells[4]
        .querySelector(".save-btn")
        .addEventListener("click", async () => {
          await saveChanges(row, email, onSaveFunction, onReloadFunction);
        });
      cells[4].querySelector(".cancel-btn").addEventListener("click", () => {
        restoreRow(row);
      });
    }
  };
// Funció per restaurar la fila a l'estat original
  const restoreRow = (row) => {
    const cells = row.querySelectorAll("td");
    cells[0].textContent = row.dataset.originalName;
    cells[1].textContent = row.dataset.originalEmail;
    const originalRole = row.dataset.originalRole;
    const rolClass = standardizeName(originalRole);
    cells[2].className = `role-cell rol-${rolClass}`;
    cells[2].innerHTML = `<span class="role-badge">${originalRole}</span>`;
    const originalDpt = row.dataset.originalDpt;
    const dptClass = standardizeName(originalDpt);
    cells[3].className = `dpt-cell dpt-${dptClass}`;
    cells[3].innerHTML = `<span class="dpt-badge">${originalDpt}</span>`;
    const originalEmail = row.dataset.originalEmail;
    cells[4].innerHTML = `
      <button class="action-btn edit-btn" data-email="${originalEmail}">📝 Editar</button>
      <button class="action-btn delete-btn" data-email="${originalEmail}">🗑️ Eliminar</button> 
    `;
    cells[4].querySelector(".edit-btn").addEventListener("click", (e) => {
      toggleEditMode(e.target, originalEmail);
    });
    cells[4].querySelector(".delete-btn").addEventListener("click", (e) => {
      handleDelete(originalEmail);
    });
    row.classList.remove("editing");
  };

  const saveChanges = async (
    row,
    originalEmail,
    onSaveFunction,
    onReloadFunction
  ) => {
    // Desactivar botons durant el procés
    const saveButton = row.querySelector(".save-btn");
    const cancelButton = row.querySelector(".cancel-btn");
    saveButton.textContent = "Guardant...";
    saveButton.disabled = true;
    cancelButton.disabled = true;
// Obtenir els nous valors
    try {
      const newName = row.querySelector('input[data-field="nom"]').value;
      const newEmail = row.querySelector('input[data-field="email"]').value;
      const newRole = row.querySelector('select[data-field="role"]').value;
      const newDpt = row.querySelector(
        'select[data-field="nom_departament"]'
      ).value;

      const updatedFields = {
        nom: newName,
        email: newEmail,
        role: newRole,
        nom_departament: newDpt,
      };

      const success = await onSaveFunction(originalEmail, updatedFields);

      if (success) {
        alert(`✅ Usuari ${newName} (${newEmail}) actualitzat correctament!`);
        onReloadFunction();
      } else {
        alert(
          "❌ Error al guardar. Potser no tens permisos (RLS) o hi ha un error de connexió."
        );
        saveButton.textContent = "💾 Guardar";
        saveButton.disabled = false;
        cancelButton.disabled = false;
      }
    } catch (error) {
      console.error("Error durant el procés de guardat:", error);
      alert("❌ Error intern durant el guardat.");
      saveButton.textContent = "💾 Guardar";
      saveButton.disabled = false;
      cancelButton.disabled = false;
    }
  };

  // =======================================================
// 5. INICIALITZACIÓ I EVENT LISTENERS
  // =======================================================

  // Inicialitzar la taula
  renderTable();

  // Afegir listener per a la cerca
  const searchInput = tableContainer.querySelector("#userSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      handleSearch(e.target.value);
    });
  }

  return tableContainer;
}
