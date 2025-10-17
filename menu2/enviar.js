/**
 * enviar.js
 * Conté la lògica i la creació de la vista 'Enviar', incloent la previsualització d'arxius
 * i els camps de formulari actualitzats (Tipus document, Tècnic, Data, Proveïdor, Import).
 */

// Funció per carregar la previsualització de l'arxiu (Utilitza IFRAME)
function setupFileUploadListener(component) {
  const fileInput = component.querySelector("#file_upload");
  const pdfViewer = component.querySelector("#pdf_viewer");

  if (fileInput && pdfViewer) {
    let previousFileURL = null;

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];

      // Netejar la URL anterior si n'hi ha una
      if (previousFileURL) {
        URL.revokeObjectURL(previousFileURL);
        previousFileURL = null;
      }

      if (file) {
        if (file.type === "application/pdf") {
          // 1. Crear URL de l'objecte local i guardar la referència
          const fileURL = URL.createObjectURL(file);
          previousFileURL = fileURL;

          // 2. Inserir l'iframe que utilitzarà el visualitzador natiu del navegador
          pdfViewer.innerHTML = `
                        <iframe 
                            src="${fileURL}" 
                            style="width: 100%; height: 100%; border: none;"
                        >
                            El vostre navegador no suporta la previsualització d'arxius PDF.
                        </iframe>
                    `;
        } else {
          // Si no és un PDF
          pdfViewer.innerHTML = `
                        <p style="color: #f44336; font-weight: bold;">❌ Format no compatible.</p>
                        <p>Si us plau, selecciona un arxiu PDF.</p>
                    `;
          fileInput.value = ""; // Netejar l'input
        }
      } else {
        // Si l'usuari cancel·la la selecció
        pdfViewer.innerHTML = `<div class="pdf-placeholder-text">Previsualització del Document</div>`;
      }
    });
  }
}

// Exportem la funció de creació del component
export function createEnviarComponent() {
  const component = document.createElement("section");
  component.classList.add("service-section");

  // COLUMNA ESQUERRA (Formulari + Càrrega)
  const leftColumn = document.createElement("div");
  leftColumn.classList.add("service-column", "vertical-split");

  // ----------------------------------------------------
  // SECCIÓ SUPERIOR AMB TOTS ELS CAMPS REQUERITS
  // ----------------------------------------------------
  const topSection = document.createElement("div");
  topSection.classList.add("top-sub-section");
  topSection.innerHTML = `
            <h3>Dades de l'Enviament 📋</h3>
            
            <div class="form-group-inline">
                <label for="tipus_document">Tipus de Document:</label>
                <select id="tipus_document" class="form-input">
                    <option value="menor">Menor</option>
                    <option value="no_lcsp">No LCSP</option>
                    <option value="licitacio">Licitació</option>
                </select>
            </div>

            <div class="form-group-inline">
                <label for="tecnic">Tècnic:</label>
                <input type="text" id="tecnic" class="form-input" placeholder="Nom del Tècnic">
            </div>
            
            <div class="form-group-inline">
                <label for="data">Data:</label>
                <div class="input-icon-container">
                    <input type="date" id="data" class="form-input date-input-field">
                    <span class="input-icon">📅</span>
                </div>
            </div>

            <div class="form-group-inline">
                <label for="proveidor">Proveïdor:</label>
                <input type="text" id="proveidor" class="form-input" placeholder="Nom del Proveïdor">
            </div>

            <div class="form-group-inline">
                <label for="import">Import (€):</label>
                <input type="number" id="import" class="form-input" placeholder="0.00" step="0.01">
            </div>
        `;

  // ----------------------------------------------------
  // SECCIÓ INFERIOR: Càrrega d'Arxiu
  // ----------------------------------------------------
  const bottomSection = document.createElement("div");
  bottomSection.innerHTML = `
            <h3>Càrrega d'Arxiu 📎</h3>
            <input type="file" id="file_upload" class="file-input" accept=".pdf"> 
            
            <button class="action-button primary-action-button" style="margin-top: 15px;">
                Enviar
            </button>
        `;

  leftColumn.appendChild(topSection);
  leftColumn.appendChild(bottomSection);

  // COLUMNA DRETA (Visualitzador PDF)
  const rightColumn = document.createElement("div");
  rightColumn.classList.add("service-column", "pdf-viewer-column");
  rightColumn.innerHTML = `
            <h3>Visualitzador PDF</h3>
            <div id="pdf_viewer" class="pdf-placeholder">
                <div class="pdf-placeholder-text">Previsualització del Document</div>
            </div>
        `;

  component.appendChild(leftColumn);
  component.appendChild(rightColumn);

  // Cridem la funció d'escoltador després de crear els elements
  setupFileUploadListener(component);

  return component;
}
