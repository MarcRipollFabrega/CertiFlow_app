/**
 * enviar.js
 * Conté la lògica i la creació de la vista 'Enviar', incloent la previsualització d'arxius
 * i els camps de formulari actualitzats (Tipus document, Tècnic, Data, Proveïdor, Import).
 */

// Funció per carregar la previsualització de l'arxiu (Utilitza IFRAME)
function setupFileUploadListener(wrapper) {
  // 🛠️ Canvi de 'component' a 'wrapper'
  const fileInput = wrapper.querySelector("#file_upload");
  const pdfViewer = wrapper.querySelector("#pdf_viewer");

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
                            style="width: 100%; height: 100%; border: none;">
                        </iframe>
                    `;
        } else {
          pdfViewer.innerHTML = `<div class="pdf-placeholder-text">❌ Només s'accepten arxius PDF.</div>`;
        }
      } else {
        pdfViewer.innerHTML = `<div class="pdf-placeholder-text">Previsualització del Document</div>`;
      }
    });
  }
}

// 🌟 NOVA FUNCIÓ: Carrega el fitxer JS de la lògica d'enviament
function loadSubmitScript(e) {
  e.preventDefault(); // Evita l'acció per defecte del botó si n'hi hagués

  // Ruta de l'arxiu de lògica d'enviament (S'assumeix que és a la carpeta JS)
  const scriptPath = "../JS/submit_logic.js";

  // 1. Comprova si l'script ja s'ha carregat per evitar duplicats
  // (Podem comentar aquesta part si volem que s'executi cada vegada)
  /*
    if (document.querySelector(`script[src="${scriptPath}"]`)) {
        console.warn("L'script de la lògica d'enviament ja està carregat.");
        return; 
    }
    */

  // 2. Crea i injecta l'element script
  const script = document.createElement("script");
  script.src = scriptPath;
  script.id = "submit-logic-script";

  script.onload = () => {
    console.log(`✅ Arxiu ${scriptPath} carregat i executat!`);
  };

  document.body.appendChild(script);
}

// Exportem la funció de creació del component
export function createEnviarComponent() {
  // 🛠️ 1. Crear el contenidor principal amb la classe de layout
  const wrapper = document.createElement("div");
  wrapper.classList.add("dashboard-wrapper"); // ⬅️ CLAU per aplicar el display: flex

  // COLUMNA ESQUERRA (Formulari + Càrrega)
  const leftColumn = document.createElement("div");
  leftColumn.classList.add("service-column", "vertical-split");

  // ----------------------------------------------------
  // SECCIÓ SUPERIOR: Camps de Formulari
  // ----------------------------------------------------
  const topSection = document.createElement("div");
  topSection.innerHTML = `
            <h2 class="section-title">Nou Document</h2>

<div class="form-group-inline">
    <label for="tipus_contracte">Tipus de Contracte:</label>
    <select id="tipus_contracte" class="form-select">
        <option value="" disabled selected>Selecciona un tipus</option>
        <option value="menor">Menor</option>
        <option value="licitacio">Licitació</option>
        <option value="fora_lcsp">Fora LCSP</option>
    </select>
</div>

            <div class="form-group-inline">
    <label for="tecnic">Tècnic:</label>
    <input 
        type="text" 
        id="tecnic" 
        class="form-input" 
        list="llistaTecnics" 
        placeholder="Escriu el nom del tècnic"
    ></div>

            <div class="form-group-inline">
                <label for="data">Data:</label>
                <input type="date" id="data" class="form-input">
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
  // SECCIÓ INFERIOR: Càrrega d'Arxiu (🌟 Amb ID al botó)
  // ----------------------------------------------------
  const bottomSection = document.createElement("div");
  bottomSection.innerHTML = `
            <h3>Càrrega d'Arxiu 📎</h3>
            <input type="file" id="file_upload" class="file-input" accept=".pdf"> 
            
            <button id="submitButton" class="action-button primary-action-button" style="margin-top: 15px;">
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

  // 🛠️ 2. Afegir les columnes al 'wrapper' (el contenidor que es retorna)
  wrapper.appendChild(leftColumn);
  wrapper.appendChild(rightColumn);

  // 🛠️ 3. Cridar el listener de càrrega d'arxiu al 'wrapper'
  setupFileUploadListener(wrapper);

  // 🌟 4. AFEGIR LISTENER AL BOTÓ 'ENVIAR'
  const submitButton = wrapper.querySelector("#submitButton");
  if (submitButton) {
    submitButton.addEventListener("click", loadSubmitScript);
  }

  // 🛠️ 5. Retornar el contenidor correcte
  return wrapper;
}
