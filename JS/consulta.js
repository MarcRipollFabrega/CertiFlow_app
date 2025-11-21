//-----------------------------------------------------------------------------
// consultar.js
// Mòdul per visualitzar dades de la BBDD i gestionar l'accés PÚBLIC al PDF.
//-----------------------------------------------------------------------------
const supabase = window.supabaseClient;
const BUCKET_NAME = "documents";
// La URL base per a l'accés públic al Storage:
const PUBLIC_URL_BASE = `${supabase.storage.url}/object/public/${BUCKET_NAME}/`;

let lastPublicUrl = null; // Variable global

// =========================================================================
// 1. FUNCIÓ PRINCIPAL EXPORTADA
// =========================================================================
export function createConsultarComponent() {
  const wrapper = document.createElement("div");
  wrapper.classList.add("service-wrapper", "consultar-wrapper");

  wrapper.innerHTML = `
    <h2 class="crud-title">🔍 Consulta de Documents</h2>
    
    <div class="split-view">
        <div class="service-column table-column">
            <h3>Registres de Documents</h3> 
            <input 
                type="text" 
                id="documentSearchInput" 
                placeholder="🔍 Cerca per Títol, Proveïdor o Tècnic..."
                class="search-input"
            >
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
 * Obté les dades de la BBDD i renderitza la taula, incloent la traça.
 */
async function fetchAndDisplayDocuments(wrapper) {
  // 💡 CANVI: AFEGIM document_traza al SELECT per carregar les dades relacionades
  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      `
        id, 
        file_path, 
        estat_document, 
        data_extreta, 
        estat_aprovacio,
        document_traza ( timestamp, accio, comentaris, user_id ) 
      `
    )
    .order("created_at", { ascending: false }); // Ordenem per data de creació

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
        <th>Técnic</th>
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
          const tecnic = dataExtreta.tecnic || "N/A";
          const numModA = dataExtreta.numero_mod_a || "N/A";
          const proveidor = dataExtreta.proveidor || "N/A";
          const fullDataString = JSON.stringify(doc);
          const encodedData = encodeURIComponent(fullDataString);

          return `
          <tr 
            data-full-doc='${encodedData}'
          >
            <td>${titol}</td>
            <td>${dataInforme}</td>
            <td>${tecnic}</td>
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
function clearSelectionAndPanel(wrapper) {
  const tableContainer = wrapper.querySelector("#consultarTableContainer");
  const table = tableContainer.querySelector(".crud-table");
  const detailsArea = wrapper.querySelector("#document_details_area");
  const tableColumn = wrapper.querySelector(".table-column");
  const pdfViewerColumn = wrapper.querySelector(".pdf-viewer-column");

  // Desselecciona totes les files
  if (table) {
    table
      .querySelectorAll("tbody tr.selected")
      .forEach((r) => r.classList.remove("selected"));
  }

  // Amaga el panell de detalls
  pdfViewerColumn.classList.remove("visible");
  tableColumn.classList.remove("contracted");

  // Restaura el text placeholder
  detailsArea.innerHTML =
    '<div class="pdf-placeholder-text">Seleccioneu un document per veure les dades i accions disponibles.</div>';
  detailsArea.classList.add("pdf-placeholder");
}


/**
 * Afegeix els listeners de clic a les files de la taula.
 */
function loadTableListeners(wrapper) {
    const tableContainer = wrapper.querySelector("#consultarTableContainer");
    const table = tableContainer.querySelector(".crud-table");

    // 💡 1. LISTENER DE CLIC FORA (Nou)
    if (tableContainer) {
        tableContainer.addEventListener("click", (event) => {
            // Comprova si el clic no ha estat sobre una fila (<tr>)
            if (!event.target.closest("tbody tr")) {
                clearSelectionAndPanel(wrapper);
            }
        });
    }

    if (table) {
        table.querySelectorAll("tbody tr").forEach((row) => {
            row.addEventListener("click", (event) => {
                // 🛑 Important: Aturem la propagació del clic des de la fila
                // Això evita que el listener del 'tableContainer' de dalt s'activi
                event.stopPropagation(); 
                
                // 2. Extreu les dades i el path del document
                const encodedData = row.dataset.fullDoc;
                const fullDocumentData = JSON.parse(decodeURIComponent(encodedData));
                const filePath = fullDocumentData.file_path;

                // 3. Referències als elements (Ja existeixen)
                const detailsArea = wrapper.querySelector("#document_details_area");
                const tableColumn = wrapper.querySelector(".table-column");
                const pdfViewerColumn = wrapper.querySelector(".pdf-viewer-column");

                // 4. GESTIÓ DEL TOGGLE (Obrir/Tancar Panell de Detalls)
                if (row.classList.contains("selected")) {
                    // Si ja està seleccionat, cridem a la funció de neteja
                    clearSelectionAndPanel(wrapper);
                    return; 
                }

                // 5. Si la fila NO estava seleccionada:
                // Desselecciona qualsevol fila anterior i amaga el panell
                clearSelectionAndPanel(wrapper); 
                
                // Selecciona la fila actual i mostra el panell
                row.classList.add("selected");
                pdfViewerColumn.classList.add("visible");   
                tableColumn.classList.add("contracted");    
                detailsArea.classList.remove("pdf-placeholder"); 

                // 6. Renderitza el panell de detalls i l'enllaç
                detailsArea.innerHTML = createDetailsAreaHtml(fullDocumentData);
                getSignedUrlAndRender(filePath, detailsArea);
            });
        });
    }

    // 7. Activa el filtre de cerca (la lògica del cercador que ja tens)
    const searchInput = wrapper.querySelector("#documentSearchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", (event) => {
            filterTable(event.target.value);
        });
    }
}

/**
 * Genera el codi HTML per a l'àrea de detalls del document (Quadre Resum).
 */
function createDetailsAreaHtml(documentData) {
  // 💡 CANVI: Utilitzem document_traza per generar l'HTML
  const trazaHtml = renderTraza(documentData.document_traza);

  const detailsHtml = `
    <div class="document-traza-container">
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
 * Renderitza la traça del document.
 */
function renderTraza(trazaData) {
  if (!trazaData || trazaData.length === 0) {
    return "<p>No hi ha traça de revisions disponible.</p>";
  }

  // 1. Ordenar per timestamp (El més recent primer)
  const sortedTraza = trazaData.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  let html = "<ul class='traza-list'>";

  sortedTraza.forEach((pas) => {
    // 2. Format de la data
    const dataFormatada = new Date(pas.timestamp).toLocaleDateString("ca-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    html += `
      <li>
        <span class="traza-timestamp">[${dataFormatada}]</span> 
        <span class="traza-action">${pas.accio || "N/A"}</span>: 
        <span class="traza-comment">${
          pas.comentaris || "Sense comentaris"
        }</span>
      </li>
    `;
  });

  html += "</ul>";
  return html;
}
/**
 * Filtra les files de la taula en funció del text introduït al cercador.
 * @param {string} searchText - El text a buscar (no sensible a majúscules/minúscules).
 */
function filterTable(searchText) {
    // Utilitzem querySelector per trobar la taula dins del contenidor
    const table = document.querySelector("#consultarTableContainer .crud-table");
    if (!table) return;

    // Normalitzem el text de cerca a majúscules per a la comparació
    const filter = searchText.toUpperCase();
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach(row => {
        // 💡 ATENCIÓ A L'ORDRE ACTUAL DE LA TAULA (createTableElement):
        // [0] Títol, [1] Data, [2] Tècnic, [3] Mod A, [4] Proveïdor, [5] Estat Document
        
        // 1. Extracció dels camps de cerca amb els índexs corregits:
        const title = row.cells[0].textContent.toUpperCase();
        const tecnic = row.cells[2].textContent.toUpperCase();    
        const proveidor = row.cells[4].textContent.toUpperCase(); 

        // 2. Lògica de Filtratge: Comprovem si el text de cerca es troba en qualsevol dels camps
        if (title.includes(filter) || proveidor.includes(filter) || tecnic.includes(filter)) {
            row.style.display = ""; // Mostra la fila
        } else {
            row.style.display = "none"; // Amaga la fila
        }
    });
}
// =========================================================================
// 5. GESTIÓ D'ACCÉS AL PDF PÚBLIC (Simplificat)
// =========================================================================
/**
 * Obté directament l'URL pública del fitxer.
 * 💡 Eliminat l'intent de createSignedUrl per evitar el 400 Bad Request
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

  // 2. GENERAR DIRECTAMENT LA URL PÚBLICA
  const finalUrl = PUBLIC_URL_BASE + pathWithoutBucket;

  // 3. Finalitzar la càrrega
  if (finalUrl) {
    lastPublicUrl = finalUrl;
    renderActionButtons(detailsArea, finalUrl);
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

  // 2. Afegeix l'HTML només per al botó OBRIR PDF
  const controlsHtml = `
 <div class="controls-area">
            <h4>Accions</h4>
            <div class="button-group">  
                <button id="openPdfButton" class="action-button primary-action-button">
                    <span class="icon">📄</span> Obrir Document
                </button>
            </div>
        </div>
    `;
  detailsArea.insertAdjacentHTML("beforeend", controlsHtml);

  // 3. Afegeix el Listener només per a Obrir
  const openButton = document.getElementById("openPdfButton");
  if (openButton) {
    openButton.addEventListener("click", () => {
      if (url) {
        // Obre l'URL pública del document en una nova pestanya
        window.open(url, "_blank");
      } else {
        console.error("No es pot obrir el PDF: URL no vàlida.");
      }
    });
  }
}
