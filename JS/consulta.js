//-----------------------------------------------------------------------------
// consultar.js
// Mòdul per visualitzar dades de la BBDD i gestionar l'accés PÚBLIC al PDF.
//-----------------------------------------------------------------------------
const supabase = window.supabaseClient;
const BUCKET_NAME = "documents";
// La URL base per a l'accés públic al Storage:
const PUBLIC_URL_BASE = `${supabase.storage.url}/object/public/${BUCKET_NAME}/`;

let lastPublicUrl = null; // Canviat de lastSignedUrl a lastPublicUrl

// =========================================================================
// 1. FUNCIÓ PRINCIPAL EXPORTADA
// =========================================================================
export function createConsultarComponent() {
  const wrapper = document.createElement("div");
  wrapper.classList.add(
    "service-wrapper",
    "consultar-wrapper"
    // ELIMINADA: "enviar-wrapper" per solucionar el problema de disseny del títol.
  );

  wrapper.innerHTML = `
    <h2 class="crud-title">🔍 Consulta de Documents</h2>
    
    <div class="split-view">
        <div class="service-column table-column">
            <h3>Registres de Documents</h3> 
            <div id="consultarTableContainer" class="table-container">
                <p>Carregant dades...</p>
            </div>
        </div>
        <div class="service-column pdf-viewer-column">
            <h3>Dades i Accions del Document</h3>
            <div id="document_details_area" class="details-area pdf-placeholder">
                <div class="pdf-placeholder-text">Seleccioneu un document per veure les dades i accions disponibles.</div>
            </div>
        </div>
    </div>
  `;
  fetchAndDisplayDocuments(wrapper);
  return wrapper;
}

// =========================================================================
// 2. GESTIÓ DE DADES (Fetch)
// =========================================================================

/**
 * Obté les dades de la BBDD i renderitza la taula.
 */
async function fetchAndDisplayDocuments(wrapper) {
  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, file_path, estat_document, data_extreta, estat_aprovacio");

  const tableContainer = wrapper.querySelector("#consultarTableContainer");
  tableContainer.innerHTML = "";

  if (error) {
    console.error("Error obtenint documents:", error);
    tableContainer.innerHTML =
      "<p class='error-message'>Error carregant dades. Reviseu la consola.</p>";
    return;
  }

  if (documents && documents.length > 0) {
    const tableElement = createTableElement(documents);
    tableContainer.appendChild(tableElement);
    loadTableListeners(wrapper);
  } else {
    tableContainer.innerHTML = "<p>No s'han trobat documents.</p>";
  }
}

// =========================================================================
// 3. RENDERITZACIÓ DE LA TAULA
// =========================================================================

/**
 * Crea l'element de la taula HTML amb els camps sol·licitats.
 */
function createTableElement(data) {
  const table = document.createElement("table");
  table.classList.add("crud-table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Títol</th>
        <th>Data</th>
        <th>Mod A</th>
        <th>Proveïdor</th>
        <th>Estat Document</th>
      </tr>
    </thead>
    <tbody>
      ${data
        .map((doc) => {
          const dataExtreta = doc.data_extreta || {};

          // Extracció de dades (camps de taula)
          const titol = dataExtreta.titol_de_linforme || "N/A";
          const dataInforme = dataExtreta.data_informe || "N/A";
          const numModA = dataExtreta.numero_mod_a || "N/A";
          const proveidor = dataExtreta.proveidor || "N/A";

          // Guardem totes les dades necessàries a un data-full-doc
          const fullDataString = JSON.stringify({
            ...doc,
            data_extreta: dataExtreta,
          });

          return `
          <tr 
            data-full-doc='${fullDataString}'
          >
            <td>${titol}</td>
            <td>${dataInforme}</td>
            <td>${numModA}</td>
            <td>${proveidor}</td>
            <td><span class="status ${doc.estat_document.toLowerCase()}">${
            doc.estat_document
          }</span></td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
  `;
  return table;
}

// =========================================================================
// 4. LÓGICA DE DETALLS I BOTONS (Nou panell de la dreta)
// =========================================================================

/**
 * Afegeix els listeners de clic a les files de la taula.
 */
function loadTableListeners(wrapper) {
  const tableContainer = wrapper.querySelector("#consultarTableContainer");
  const table = tableContainer.querySelector(".crud-table");

  if (table) {
    table.querySelectorAll("tbody tr").forEach((row) => {
      row.addEventListener("click", () => {
        // 1. Desselecciona files anteriors
        table
          .querySelectorAll("tbody tr.selected")
          .forEach((r) => r.classList.remove("selected"));

        // 2. Selecciona la fila actual
        row.classList.add("selected");

        // 3. Extreu les dades completes
        const fullDocumentData = JSON.parse(row.dataset.fullDoc);
        const filePath = fullDocumentData.file_path;

        // 4. Renderitza el panell de detalls
        const detailsArea = wrapper.querySelector("#document_details_area");
        detailsArea.innerHTML = createDetailsAreaHtml(fullDocumentData);
        detailsArea.classList.remove("pdf-placeholder");

        // 5. Obté l'URL PÚBLICA i renderitza els botons d'acció
        getSignedUrlAndRender(filePath, detailsArea);
      });
    });
  }
}

/**
 * Genera el codi HTML per a l'àrea de detalls del document (Quadre Resum).
 */
function createDetailsAreaHtml(documentData) {
  const dataExtreta = documentData.data_extreta || {};

  // Extracció i format de dades
  const titol = dataExtreta.titol_de_linforme || "N/A";
  const dataInforme = dataExtreta.data_informe || "N/A";
  const tecnic = dataExtreta.tecnic || "N/A";
  const numModA = dataExtreta.numero_mod_a || "N/A";
  const proveidor = dataExtreta.proveidor || "N/A";

  const totalSenseIva = parseFloat(dataExtreta.total_sense_iva || 0).toFixed(2);
  const totalIvaInclos = parseFloat(dataExtreta.total_iva_inclos || 0).toFixed(
    2
  );
  const estatAprovacio = documentData.estat_aprovacio || "N/A";

  // Traça (assumim que el camp pot estar buit)
  const trazaHtml = renderTraza(documentData.traza_document);

  const detailsHtml = `
    <div class="document-summary-box">
         <div class="document-summary">
            <p><strong>Títol de l'Informe:</strong> ${titol}</p>
            <p><strong>Data de l'Informe:</strong> ${dataInforme}</p>
            <p><strong>Tècnic:</strong> ${tecnic}</p>
            <p><strong>Número Mod A:</strong> ${numModA}</p>
            <p><strong>Proveïdor:</strong> ${proveidor}</p>
            <p><strong>Total (Sense IVA):</strong> ${totalSenseIva} €</p>
            <p><strong>Total (IVA Inclòs):</strong> ${totalIvaInclos} €</p>
            <p><strong>Estat Aprovació:</strong> <span class="status ${estatAprovacio.toLowerCase()}">${estatAprovacio}</span></p>
        </div>
    </div>
    
    <div class="document-traza">
        <h4>Traçabilitat del Document</h4>
        <div class="document-traza"> ${trazaHtml}
        </div>
    </div>

    <div class="controls-area loading-state">
        <p>Generant enllaç públic al document...</p>
    </div>
  `;
  return detailsHtml;
}

/**
 * Renderitza la traça del document (implementació simple).
 */
function renderTraza(trazaData) {
  if (!trazaData || trazaData.length === 0) {
    return "<p>No hi ha traça de revisions disponible.</p>";
  }
  // Aquesta implementació depèn de com estiguin les teves dades de traça
  let html = "<ul>";
  trazaData.forEach((pas) => {
    // Exemple:
    html += `<li>${pas.data || "N/A"} - ${pas.usuari || "N/A"}: ${
      pas.acció || "N/A"
    }</li>`;
  });
  html += "</ul>";
  return html;
}

// =========================================================================
// 5. GESTIÓ D'ACCÉS AL PDF PÚBLIC (SOLUCIÓ FINAL)
// =========================================================================
/**
 * 💡 NOVA FUNCIÓ: Obté la URL signada de forma segura i la passa a renderActionButtons.
* @param {string} filePath - El camí complet del fitxer al bucket (p.ex., "documents/arxiu.pdf").
 * @param {HTMLElement} detailsArea - L'àrea on es renderitzen els botons.
 */
async function getSignedUrlAndRender(filePath, detailsArea) {
  const loadingStateDiv = detailsArea.querySelector(".loading-state");
  if (loadingStateDiv) {
    loadingStateDiv.innerHTML = "<p>Generant enllaç públic al document...</p>";
  }

  // 1. Netejar el camí (per obtenir només el nom del fitxer)
  const pathWithoutBucket = filePath.startsWith(BUCKET_NAME + "/")
    ? filePath.substring(BUCKET_NAME.length + 1)
    : filePath;

  // 2. GENERAR DIRECTAMENT LA URL PÚBLICA (sense intentar la signada)
  const finalUrl = PUBLIC_URL_BASE + pathWithoutBucket;

  // 3. Finalitzar la càrrega: CRIDA SEMPRE ALS BOTONS AMB LA FINALURL
  if (finalUrl) {
    lastPublicUrl = finalUrl; 
    renderActionButtons(detailsArea, finalUrl);
    // Elimina el missatge d'advertència si hi ha
    if (loadingStateDiv) loadingStateDiv.remove();
  } else {
    if (loadingStateDiv) {
      loadingStateDiv.innerHTML = `<p class="error-message">❌ No s'ha pogut obtenir cap URL vàlida.</p>`;
    }
  }
}
/**
 * Renderitza els botons d'acció un cop s'ha obtingut la URL (pública o signada).
 */
function renderActionButtons(detailsArea, url) {
  // 1. Elimina l'estat de càrrega
  const loadingState = detailsArea.querySelector(".loading-state");
  if (loadingState) loadingState.remove();

  // 2. Afegeix l'HTML dels botons
  const controlsHtml = `
 <div class="controls-area">
            <h4>Accions</h4>
            <div class="button-group">  <button id="openPdfButton" class="action-button primary-action-button">
                    <span class="icon">📄</span> Obrir PDF
                </button>
                <button id="downloadPdfButton" class="action-button secondary-action-button">
                    <span class="icon">⬇️</span> Descarregar
                </button>
            </div>
        </div>
    `;
  detailsArea.insertAdjacentHTML("beforeend", controlsHtml);

  // 3. Afegeix Listeners (Utilitzant l'URL pública)
  document.getElementById("openPdfButton").addEventListener("click", () => {
    if (url) {
      window.open(url, "_blank");
    } else {
      console.error("No es pot obrir el PDF: URL no vàlida.");
    }
  });

  document.getElementById("downloadPdfButton").addEventListener("click", () => {
    if (url) {
      // Mètode segur per forçar la descàrrega
      const tempLink = document.createElement("a");
      tempLink.href = url;
      // Defineix el nom del fitxer a descarregar
      const fileName = url.substring(url.lastIndexOf("/") + 1);
      tempLink.download = fileName;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    }
  });
}
