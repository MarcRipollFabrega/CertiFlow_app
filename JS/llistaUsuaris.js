// Fitxer: ../JS/llistaUsuaris.js

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
  onDeleteFunction // 🚨 NOU PARÀMETRE
) {
  const tableContainer = document.createElement("div");
  tableContainer.className = "llista-usuaris-container";

  tableContainer.innerHTML = `
        <h3 class="crud-title">Llistat d'Usuaris</h3>
        <div id="llistaUsuarisContent" class="table-responsive">
            <p>Carregant dades...</p>
        </div>
        <p id="llistaUsuarisEstat" class="status-message"></p>
    `;

  const contentDiv = tableContainer.querySelector("#llistaUsuarisContent");
  const statusMessage = tableContainer.querySelector("#llistaUsuarisEstat");

  // Funció auxiliar per crear l'HTML del select
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

  // 💡 HELPER CORREGIT: Funció per estandarditzar noms (elimina accents, espais a guions i minúscules)
  const standardizeName = (name) => {
    if (!name) return "";

    // 1. Convertir a minúscules
    let standardized = name.toLowerCase();

    // 2. Eliminar accents/diacrítics (Gestió -> Gestio, Tècnic -> Tecnic)
    standardized = standardized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // 3. Reemplaçar espais per guions
    return standardized.replace(/\s+/g, "-");
  };

  // Funció per carregar la taula
  const renderTable = async () => {
    contentDiv.innerHTML =
      '<p class="status-message info">Carregant d\'usuaris... ⏳</p>';
    statusMessage.textContent = "";

    try {
      const usuaris = await loadUsuarisFunction(); // Crida a la funció de càrrega

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

      // Afegir listeners d'esdeveniments als botons d'acció
      const editButtons = tableContainer.querySelectorAll(
        ".action-btn.edit-btn"
      );
      editButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const email = e.target.dataset.email;
          toggleEditMode(e.target, email);
        });
      });

      // 🚨 NOU: Afegir listener per als botons DELETE
      const deleteButtons = tableContainer.querySelectorAll(
        ".action-btn.delete-btn"
      );
      deleteButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const email = e.target.dataset.email;
          handleDelete(email); // Crida a la nova funció de gestió d'eliminació
        });
      });
    } catch (error) {
      console.error("Error al renderitzar la taula d'usuaris:", error);
      contentDiv.innerHTML =
        '<p class="status-message error">❌ Error fatal al carregar el llistat.</p>';
    }
  };

  // =======================================================
  // 2. LÒGICA D'ELIMINACIÓ
  // =======================================================

  /**
   * 🚨 NOU: Funció asíncrona per gestionar l'eliminació d'un usuari.
   * @param {string} email - L'email de l'usuari a eliminar.
   */
  const handleDelete = async (email) => {
    const confirmation = confirm(
      `Estàs segur que vols eliminar l'usuari amb email: ${email}? Aquesta acció no es pot desfer.`
    );

    if (!confirmation) {
      return; // Cancel·lat per l'usuari
    }

    // 1. Cercar el botó DELETE corresponent per canviar l'estat
    const deleteButton = tableContainer.querySelector(
      `.action-btn.delete-btn[data-email="${email}"]`
    );
    if (deleteButton) {
      deleteButton.textContent = "Eliminant...";
      deleteButton.disabled = true;
    }

    try {
      // 2. Cridar la funció d'eliminació de Supabase (passada com a paràmetre)
      const success = await onDeleteFunction(email);

      if (success) {
        alert(`✅ Usuari ${email} eliminat correctament!`);
        onReloadFunction(); // Recarregar la taula
      } else {
        alert(
          "❌ Error a l'eliminar. Potser no tens permisos (RLS) o hi ha un error de connexió."
        );
        // Re-habilitar si falla
        if (deleteButton) {
          deleteButton.textContent = "🗑️ Eliminar";
          deleteButton.disabled = false;
        }
      }
    } catch (error) {
      console.error("Error durant el procés d'eliminació:", error);
      alert("❌ Error intern durant l'eliminació.");
      // Re-habilitar si falla
      if (deleteButton) {
        deleteButton.textContent = "🗑️ Eliminar";
        deleteButton.disabled = false;
      }
    }
  };

  // =======================================================
  // 3. LÒGICA D'EDICIÓ I GUARDAT (Era la secció 2)
  // =======================================================

  /**
   * Funció per alternar entre mode visualització i edició/guardat.
   */
  const toggleEditMode = (button, email) => {
    const row = button.closest("tr");
    const isEditing = row.classList.contains("editing");

    // Les cel·les
    const cells = row.querySelectorAll("td");

    if (!isEditing) {
      // -----------------------------------
      // --- MODE EDICIÓ (Transformació de la fila) ---
      // -----------------------------------

      row.classList.add("editing");

      // 1. Lectura dels valors actuals i guardat al dataset de la fila
      const currentRoleText = cells[2].querySelector(".role-badge").textContent;
      // Lectura del departament
      const currentDptText = cells[3].querySelector(".dpt-badge").textContent;

      row.dataset.originalName = cells[0].textContent;
      row.dataset.originalEmail = cells[1].textContent;
      row.dataset.originalRole = currentRoleText;
      row.dataset.originalDpt = currentDptText;

      // 2. Transformació de les cel·les a Inputs/Selects
      cells[0].innerHTML = `<input type="text" data-field="nom" value="${row.dataset.originalName}" class="edit-input-text" required>`;
      cells[1].innerHTML = `<input type="email" data-field="email" value="${row.dataset.originalEmail}" class="edit-input-text" required>`;

      // Selects
      cells[2].innerHTML = createSelectHTML("role", roles, currentRoleText);
      cells[3].innerHTML = createSelectHTML(
        "nom_departament",
        departaments,
        row.dataset.originalDpt
      );

      // 3. Transformació dels botons (Accions)
      cells[4].innerHTML = `
        <button class="action-btn save-btn">💾 Guardar</button>
        <button class="action-btn cancel-btn">❌ Cancel·lar</button>
      `;

      // 4. Afegir listeners per a Guardar i Cancel·lar
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

  /**
   * Funció per restaurar la fila al seu estat original.
   */
  const restoreRow = (row) => {
    const cells = row.querySelectorAll("td");

    // 1. Restaurar el contingut de les cel·les amb els valors originals del dataset
    cells[0].textContent = row.dataset.originalName;
    cells[1].textContent = row.dataset.originalEmail;

    // 2. Restaurar el badge del rol i les seves classes
    const originalRole = row.dataset.originalRole;
    const rolClass = standardizeName(originalRole);
    cells[2].className = `role-cell rol-${rolClass}`;
    cells[2].innerHTML = `<span class="role-badge">${originalRole}</span>`;

    // 3. Restaurar el badge del departament i les seves classes
    const originalDpt = row.dataset.originalDpt;
    const dptClass = standardizeName(originalDpt);
    cells[3].className = `dpt-cell dpt-${dptClass}`;
    cells[3].innerHTML = `<span class="dpt-badge">${originalDpt}</span>`;

    // 4. Restaurar el botó d'Editar i el de DELETE original
    const originalEmail = row.dataset.originalEmail;
    cells[4].innerHTML = `
      <button class="action-btn edit-btn" data-email="${originalEmail}">📝 Editar</button>
      <button class="action-btn delete-btn" data-email="${originalEmail}">🗑️ Eliminar</button> 
    `;
    cells[4].querySelector(".edit-btn").addEventListener("click", (e) => {
      toggleEditMode(e.target, originalEmail);
    });
    // 🚨 MODIFICAT: Afegir listener al botó DELETE restaurat
    cells[4].querySelector(".delete-btn").addEventListener("click", (e) => {
      handleDelete(originalEmail);
    });

    row.classList.remove("editing");
  };

  /**
   * Funció asíncrona per recollir les dades i cridar la funció de guardat
   */
  const saveChanges = async (
    row,
    originalEmail,
    onSaveFunction,
    onReloadFunction
  ) => {
    // 1. Deshabilitar botons mentre es guarda
    const saveButton = row.querySelector(".save-btn");
    const cancelButton = row.querySelector(".cancel-btn");
    saveButton.textContent = "Guardant...";
    saveButton.disabled = true;
    cancelButton.disabled = true;

    try {
      // 2. Recollir els valors nous
      const newName = row.querySelector('input[data-field="nom"]').value;
      const newEmail = row.querySelector('input[data-field="email"]').value;
      const newRole = row.querySelector('select[data-field="role"]').value;
      const newDpt = row.querySelector(
        'select[data-field="nom_departament"]'
      ).value;

      // 3. Preparar les dades per a l'actualització
      const updatedFields = {
        nom: newName,
        email: newEmail,
        role: newRole,
        nom_departament: newDpt,
      };

      // 4. Cridar la funció de guardat de Supabase.
      const success = await onSaveFunction(originalEmail, updatedFields);

      if (success) {
        alert(`✅ Usuari ${newName} (${newEmail}) actualitzat correctament!`);
        onReloadFunction(); // Recarregar la taula
      } else {
        alert(
          "❌ Error al guardar. Potser no tens permisos (RLS) o hi ha un error de connexió."
        );
        // Re-habilitar botons si falla
        saveButton.textContent = "💾 Guardar";
        saveButton.disabled = false;
        cancelButton.disabled = false;
      }
    } catch (error) {
      console.error("Error durant el procés de guardat:", error);
      alert("❌ Error intern durant el guardat.");
      // Re-habilitar botons si falla
      saveButton.textContent = "💾 Guardar";
      saveButton.disabled = false;
      cancelButton.disabled = false;
    }
  };

  // Inicialitzar la càrrega de la taula
  renderTable();

  return tableContainer;
}
