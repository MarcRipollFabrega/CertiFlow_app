//-----------------------------------------------------------------------------
// consultar.js
// Mòdul per visualitzar dades de la BBDD i gestionar l'accés PÚBLIC al PDF.
//-----------------------------------------------------------------------------

import { handleSignDocument } from "./signar.js";

const supabase = window.supabaseClient;
const BUCKET_NAME = "documents";
// La URL base per a l'accés públic al Storage:
const PUBLIC_URL_BASE = `${supabase.storage.url}/object/public/${BUCKET_NAME}/`;
// 💡 CONSTANT PER A L'EDGE FUNCTION DE SIGNATURA (S'ha d'assumir que està a window)
const APPLY_SIGNATURE_FUNCTION_URL = window.APPLY_SIGNATURE_FUNCTION_URL;

let lastPublicUrl = null; // Variable global

let selectedSignerName = null;

// =========================================================================
// 1. FUNCIONS AUXILIARS
// =========================================================================

/**
 * Funció per obtenir l'email de l'usuari actual.
 */
async function getCurrentUserEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? user.email : null;
}

/**
 * Funció per obtenir l'ID de l'usuari actual.
 */
async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? user.id : null;
}

/**
 * Funció per parsejar de forma segura la columna data_extreta, gestionant
 * la doble codificació (com es va observar amb el segon format que no llegia).
 * @param {string | object} data - El valor de la columna data_extreta.
 * @returns {object} Un objecte JSON vàlid o un objecte buit.
 */
function safeParseDataExtreta(data) {
  if (typeof data === "object" && data !== null) {
    return data; // Ja és un objecte JS (cas ideal)
  }
  if (typeof data === "string") {
    try {
      let parsed = JSON.parse(data);
      // Si el resultat del primer parsejat és encara un string, vol dir que està doble-codificat
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    } catch (e) {
      console.error("❌ Error al parsejar data_extreta:", e);
      return {}; // Retorna objecte buit en cas d'error de parseig
    }
  }
  return {}; // Retorna objecte buit per defecte
}

// =========================================================================
// 2. LÒGICA DEL WORKFLOW DE SIGNATURA (NOVA SECCIÓ PER CORREGIR L'ERROR)
// =========================================================================

// Ordre del workflow de signatura: Tècnic -> Cap de Secció -> Jurídic -> Gerent
// 💡 NOTA: S'utilitza el rol 'Técnic' tal com apareix en les dades SQL de 'usuaris'
const SIGN_ORDER = {
  Técnic: "Cap de Secció",
  "Cap de Secció": "Jurídic",
  Jurídic: "Gerent",
  Gerent: "Finalitzat",
};

/**
 * Funció auxiliar per cridar l'Edge Function de notificació.
 */
async function triggerNotificationFunction(documentId, signerEmail) {
  const NOTIFICATION_FUNCTION_URL = window.NOTIFICATION_FUNCTION_URL;

  const response = await fetch(NOTIFICATION_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      signer_email: signerEmail,
      action: "pending_sign", // L'acció que usi la teva Edge Function
    }),
  });

  const result = await response.json();
  if (!response.ok || result.error) {
    console.error(
      "❌ Error a la notificació:",
      result.error || "Error desconegut"
    );
    return false;
  }
  return true;
}

/**
 * Funció per obtenir les dades (email, nom, id) d'un usuari pel seu rol.
 */
async function getSignerDetailsByRole(role) {
  const { data, error } = await supabase
    .from("usuaris")
    .select("id, email, nom")
    .eq("role", role)
    // 💡 IMPORTANT: Si hi ha múltiples usuaris amb el mateix rol, s'agafa el primer.
    .limit(1)
    .single();

  if (error || !data) {
    if (role !== "Finalitzat") {
      console.error(`❌ No s'ha trobat usuari per al rol: ${role}`, error);
    }
    return { email: null, name: null, id: null };
  }
  return { email: data.email, name: data.nom, id: data.id };
}

// =========================================================================
// 3. FUNCIÓ PRINCIPAL EXPORTADA
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
// 4. GESTIÓ DE DADES (Fetch)
// =========================================================================

/**
 * Obté les dades de la BBDD i renderitza la taula, incloent la traça i el flux de signatura.
 */
async function fetchAndDisplayDocuments(wrapper) {
  // 💡 SELECT INCLOU documents_sign_flow
  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      `
        id, 
        file_path, 
        estat_document, 
        data_extreta, 
        estat_aprovacio,
        document_traza ( timestamp, accio, comentaris, user_id ),
        document_sign_flow:documents_sign_flow ( signer_email, signer_name, status, document_id, created_at )
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
// 5. RENDERITZACIÓ DE LA TAULA
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
        <th>Tècnic</th>
        <th>Mod A</th>
        <th>Proveïdor</th>
        <th>Estat Signatura</th> 
        <th>Estat Document</th>
      </tr>
    </thead>
    <tbody>
      ${data
        .map((doc) => {
          // 💡 CORRECCIÓ CLAU: Utilitza el parser segur per obtenir l'objecte dataExtreta.
          const dataExtreta = safeParseDataExtreta(doc.data_extreta);

          // Extracció de dades (camps de taula)
          const titol = dataExtreta.titol_de_linforme || "N/A";
          const dataInforme = dataExtreta.data_informe || "N/A";
          const tecnic = dataExtreta.tecnic || "N/A";
          const numModA = dataExtreta.numero_mod_a || "N/A";
          const proveidor = dataExtreta.proveidor || "N/A";
          const fullDataString = JSON.stringify(doc);
          const encodedData = encodeURIComponent(fullDataString);

          // Lògica d'accés a la relació niuada (CORRECTA)
          const signFlow = doc.document_sign_flow;
          const signFlowStatus = signFlow ? signFlow.status : "N/A";

          // 🛠️ CORRECCIÓ CLAU: Utilitzem .trim() per eliminar espais invisibles en la comparació
          const isPendingSignature =
            signFlow && signFlowStatus.trim() === "Pendent de signatura";

          const alertIcon = isPendingSignature
            ? '<span class="status-icon pending-icon">✍️</span>' // Icona de ploma per signatura
            : "";

          const statusClass =
            doc.estat_document.toLowerCase() +
            (isPendingSignature ? " pending-sign" : "");

          return `
          <tr 
            data-full-doc='${encodedData}'
          >
            <td>${titol}</td>
            <td>${dataInforme}</td>
            <td>${tecnic}</td>
            <td>${numModA}</td>
            <td>${proveidor}</td>
            
            <td>${alertIcon} ${signFlowStatus}</td>
            
           <td><span class="status ${statusClass}">${doc.estat_document}</span></td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
  `;
  return table;
}

// =========================================================================
// 6. LÓGICA DE DETALLS I BOTONS (Nou panell de la dreta)
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
        // 💡 CANVI CLAU: Passem l'objecte complet del document.
        getSignedUrlAndRender(fullDocumentData, detailsArea);
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

  rows.forEach((row) => {
    // [0] Títol, [1] Data, [2] Tècnic, [3] Mod A, [4] Proveïdor, [5] Estat Document

    // 1. Extracció dels camps de cerca
    const title = row.cells[0].textContent.toUpperCase();
    const tecnic = row.cells[2].textContent.toUpperCase();
    const proveidor = row.cells[4].textContent.toUpperCase();

    // 2. Lògica de Filtratge: Comprovem si el text de cerca es troba en qualsevol dels camps
    if (
      title.includes(filter) ||
      proveidor.includes(filter) ||
      tecnic.includes(filter)
    ) {
      row.style.display = ""; // Mostra la fila
    } else {
      row.style.display = "none"; // Amaga la fila
    }
  });
}
// =========================================================================
// 7. GESTIÓ D'ACCÉS AL PDF PÚBLIC (Amb Lògica de Botons)
// =========================================================================
/**
 * Obté directament l'URL pública del fitxer.
 * @param {object} fullDocumentData - L'objecte complet del document de la BBDD.
 * @param {HTMLElement} detailsArea - L'àrea on es renderitzen els botons.
 */
async function getSignedUrlAndRender(fullDocumentData, detailsArea) {
  console.log("--- Iniciant getSignedUrlAndRender ---");
  const filePath = fullDocumentData.file_path;
  const loadingStateDiv = detailsArea.querySelector(".loading-state");
  let finalUrl = null;

  if (loadingStateDiv) {
    loadingStateDiv.innerHTML = "<p>Generant enllaç al document...</p>";
  }

  try {
    // 1. Netejar el camí (per obtenir només el nom del fitxer)
    const pathWithoutBucket = filePath.startsWith(BUCKET_NAME + "/")
      ? filePath.substring(BUCKET_NAME.length + 1)
      : filePath; // 2. GENERAR DIRECTAMENT LA URL PÚBLICA (No cal SignedUrl si és públic)

    finalUrl = PUBLIC_URL_BASE + pathWithoutBucket;

    // 3. Verificació de l'URL (per si BUCKET_NAME o filePath estiguessin buits)
    if (!finalUrl || finalUrl.endsWith("/")) {
      throw new Error(
        "La URL generada no és vàlida. Revisa BUCKET_NAME o file_path."
      );
    }

    console.log("URL generada:", finalUrl); // 4. Obtenció de l'email i Renderització dels botons

    const currentUserEmail = await getCurrentUserEmail();
    // 🛑 APLIQUEM TRY/CATCH PER CAPTURAR ERRORS DE renderActionButtons
    renderActionButtons(
      detailsArea,
      finalUrl,
      fullDocumentData,
      currentUserEmail
    ); // 5. Finalització exitosa

    lastPublicUrl = finalUrl;
    if (loadingStateDiv) loadingStateDiv.remove();
  } catch (error) {
    console.error("❌ ERROR FATAL a getSignedUrlAndRender:", error); // 6. Mostrar missatge d'error en cas de fallada
    if (loadingStateDiv) {
      loadingStateDiv.innerHTML = `<p class="error-message">❌ No s'ha pogut carregar el document: ${error.message}</p>`;
    } else {
      detailsArea.innerHTML = `<p class="error-message">❌ No s'ha pogut carregar el document: ${error.message}</p>`;
    }
  }
}
/**
 * Renderitza els botons d'acció un cop s'ha obtingut la URL (pública o signada).
 * Aquesta funció inclou la lògica del botó de signatura.
 */
function renderActionButtons(detailsArea, url, documentData, currentUserEmail) {
  // 1. Elimina l'estat de càrrega
  const loadingState = detailsArea.querySelector(".loading-state");
  if (loadingState) loadingState.remove();

  let pendingSignEntry = null;
  const signFlowData = documentData.document_sign_flow;

  // 2. ADAPTACIÓ CRÍTICA A LA DADA REBUDA DE SUPABASE
  if (Array.isArray(signFlowData)) {
    // CAS 1: És un ARRAY (Més d'una entrada al flux)
    pendingSignEntry = signFlowData.find(
      (entry) =>
        entry.signer_email.toLowerCase().trim() ===
          currentUserEmail.toLowerCase().trim() &&
        entry.status.trim() === "Pendent de signatura"
    );
  } else if (signFlowData !== null && typeof signFlowData === "object") {
    // CAS 2: És un OBJECTE SIMPLE (Només una entrada al flux)
    // Comprovem les propietats directament de l'objecte
    // Hem d'assegurar que les propietats existeixen abans d'usar .toLowerCase()
    const signerEmail = signFlowData.signer_email || "";
    const status = signFlowData.status || "";

    if (
      signerEmail.toLowerCase().trim() ===
        currentUserEmail.toLowerCase().trim() &&
      status.trim() === "Pendent de signatura"
    ) {
      pendingSignEntry = signFlowData;
    }
  }

  // Si no és ni array ni objecte, pendingSignEntry serà null, i isSigner serà false.

  const isSigner = !!pendingSignEntry;

  if (isSigner) {
    selectedSignerName = pendingSignEntry.signer_name;
  } else {
    selectedSignerName = null;
  }

  // ---------------------------------------------------------------------
  // LOGS DE DEBUGGING
  console.log(
    "Tipus de document_sign_flow (Després del check):",
    Array.isArray(signFlowData) ? "array" : typeof signFlowData
  );
  console.log(
    "Contingut de document_sign_flow (Si és array, només veuràs el primer):",
    Array.isArray(signFlowData) ? signFlowData[0] : signFlowData
  );
  console.log("Email de l'Usuari Actual:", currentUserEmail);
  console.log("Entrada Pendent Trobada:", pendingSignEntry);
  console.log("Condició isSigner (Botó visible):", isSigner);
  // ---------------------------------------------------------------------

  let controlsHtml = `
    <div class="controls-area">
      <h4>Accions</h4>
      <div class="button-group">  
        <button id="openPdfButton" class="action-button secondary-action-button">
          <span class="icon">📄</span> Obrir Document
        </button>
  `;

  if (isSigner) {
    controlsHtml += `
      <button 
        id="signDocumentButton" 
        class="action-button primary-action-button" 
        data-document-id="${documentData.id}"
        data-file-path="${documentData.file_path}"
        data-document-title="${documentData.titol}"  >
        <span class="icon">✍️</span> Signar Document (Com a ${pendingSignEntry.signer_name})
      </button>
    `;
  }

  controlsHtml += `
      </div>
    </div>
  `;

  detailsArea.insertAdjacentHTML("beforeend", controlsHtml);

  // 3. Afegeix el Listener per a Obrir (sense canvis)
  const openButton = document.getElementById("openPdfButton");
  if (openButton) {
    openButton.addEventListener("click", () => {
      if (url) {
        window.open(url, "_blank");
      } else {
        console.error("No es pot obrir el PDF: URL no vàlida.");
      }
    });
  }

  // 4. 🛠️ CORRECCIÓ CLAU: AFEGIR LISTENER PER AL BOTÓ DE SIGNAR
  const signButton = document.getElementById("signDocumentButton");
  if (signButton) {
    // CRIDA LA NOVA FUNCIÓ QUE GESTIONA LA SIGNATURA I L'AVANÇ DEL FLUX
    signButton.addEventListener("click", async () => {
      const documentId = signButton.getAttribute("data-document-id");
      const documentTitle = signButton.getAttribute("data-document-title");

      // ❌ Aquest helper (getCurrentUserEmail) s'hauria de mantenir a consulta.js o exportar-se.
      // Assumim que l'has mantingut a consulta.js
      const signerEmail = await getCurrentUserEmail();

      if (documentId && signerEmail && documentTitle) {
        // ✅ Trucada a la funció del nou mòdul
        await handleSignDocument(documentId, signerEmail, documentTitle);
      } else {
        alert(
          "Error: Falten dades (ID document, Email usuari o Títol) per signar."
        );
      }
    });
  }
}
