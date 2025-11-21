//-----------------------------------------------------------------------------
// Enviar.js
// Mòdul per gestionar la càrrega, previsualització i enviament de dades extretes
// des de documents PDF.
//-----------------------------------------------------------------------------
// Supabase Client
const supabase = window.supabaseClient;

// Importar funcions necessàries des de pdf-extractor.js
import {
  renderTable,
  prepareDataForDB,
  extractDataFromPDF,
} from "./pdf-extractor.js";

// Funció per obtenir l'ID de l'usuari actual
async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? user.id : null;
}

/**
 * Funció principal per gestionar la càrrega del fitxer i la inserció a la BBDD.
 */
async function sendToDatabase(file, extractedData, sendToDbButton) {
  if (!extractedData || !file) {
    alert(
      "❌ No es pot enviar: No s'ha processat cap document o l'extracció ha fallat."
    );
    return;
  }

  sendToDbButton.disabled = true;
  sendToDbButton.textContent = "Enviant document...";

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error(
        "Usuari no autenticat. Si us plau, torni a iniciar sessió."
      );
    }
    const dbObject = prepareDataForDB(extractedData);

    // 1. GENERACIÓ DELS CAMINS amb neteja de caràcters especials
    const BUCKET_NAME = "documents";
    const uniqueId = crypto.randomUUID();

    // Neteja agressiva: Substitueix espais i elimina caràcters no segurs
    let cleanedFileName = file.name
      .replace(/\s/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    // Assegura l'extensió si s'ha perdut
    if (!cleanedFileName.toLowerCase().endsWith(".pdf")) {
      cleanedFileName += ".pdf";
    }

    // RUTA PER AL STORAGE (Només el nom del fitxer, SENSE el prefix 'documents/')
    const storagePath = `${uniqueId}_${Date.now()}_${cleanedFileName}`;

    // RUTA COMPLETA PER A LA BBDD (Inclou el prefix 'documents/')
    const fullFilePathForDB = `${BUCKET_NAME}/${storagePath}`;

    // =======================================================
    // PAS 1: CARREGAR EL PDF A SUPABASE STORAGE
    // =======================================================
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError)
      throw new Error(`Error en la càrrega del fitxer: ${uploadError.message}`);

    // =======================================================
    // PAS 2: INSERIR EL REGISTRE A LA TAULA 'documents'
    // =======================================================
    const { data: documentData, error: dbError } = await supabase
      .from("documents")
      .insert([
        {
          file_path: fullFilePathForDB,
          enviat_per: userId,
          data_extreta: dbObject,
          estat_document: "Pendent",
        },
      ])
      .select("id")
      .single();

    if (dbError)
      throw new Error(`Error en la inserció del document: ${dbError.message}`);
    const documentId = documentData.id;

    // =======================================================
    // PAS 3: REGISTRAR LA TRAÇA INICIAL
    // =======================================================
    const { error: trazaError } = await supabase.from("document_traza").insert([
      {
        document_id: documentId,
        user_id: userId,
        accio: "Enviat",
        comentaris: "Document carregat i dades extretes correctament.",
      },
    ]);

    if (trazaError) {
      console.warn(
        "⚠️ Advertència: Error al registrar la traça inicial:",
        trazaError
      );
    }

    alert("✅ Document i dades enviades correctament a la BBDD!");
  } catch (error) {
    console.error("❌ ERROR FATAL en l'enviament a BBDD:", error);
    alert(`❌ Error a l'enviar el document: ${error.message}`);
  } finally {
    sendToDbButton.disabled = false;
    sendToDbButton.textContent = "Enviar a BBDD (JSON)";
  }
}

// Funció per processar el fitxer PDF carregat
async function processFile(
  file,
  pdfViewer,
  outputTableContainer,
  sendToDbButton,
  previousFileURL
) {
  // Netejar la URL anterior si existeix
  if (previousFileURL) {
    URL.revokeObjectURL(previousFileURL);
    previousFileURL = null;
  }

  if (file && file.type === "application/pdf") {
    // 1. Crear una URL per al fitxer carregat
    const fileURL = URL.createObjectURL(file);

    // 2. Mostrar el PDF al visualitzador
    pdfViewer.innerHTML = `
      <iframe 
        src="${fileURL}" 
        width="100%" 
        height="100%" 
        style="border: none;"
      ></iframe>
    `;

    // 3. Processar el PDF i extreure les dades
    try {
      outputTableContainer.innerHTML =
        "<p>Processant document... si us plau, esperi.</p>";
      sendToDbButton.disabled = true;
      const currentExtractedData = await extractDataFromPDF(file);
      renderTable(currentExtractedData, outputTableContainer);

      // 4. Configurar el botó d'enviament a BBDD
      sendToDbButton.disabled = false;
      sendToDbButton.onclick = () =>
        sendToDatabase(file, currentExtractedData, sendToDbButton);

      return fileURL;
    } catch (error) {
      outputTableContainer.innerHTML = `<p style="color: red;">Error en processar el PDF: ${error.message}</p>`;
      sendToDbButton.disabled = true;
      console.error(error);
      return null;
    }
  } else {
    pdfViewer.innerHTML = `<div class="pdf-placeholder-text">Si us plau, carregui un fitxer PDF.</div>`;
    return null;
  }
}

// Configura els listeners per a la càrrega de fitxers i Drag and Drop
function setupFileUploadListener(wrapper) {
  const fileInput = wrapper.querySelector("#file_upload");
  const pdfViewer = wrapper.querySelector("#pdf_viewer");
  const outputTableContainer = wrapper.querySelector("#outputTableContainer");
  const sendToDbButton = wrapper.querySelector("#sendToDbButton");
  let previousFileURL = null;
  // Assegurar que tots els elements existeixen
  if (fileInput && pdfViewer && outputTableContainer && sendToDbButton) {
    // Gestió de la càrrega de fitxers
    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      previousFileURL = await processFile(
        file,
        pdfViewer,
        outputTableContainer,
        sendToDbButton,
        previousFileURL
      );
      event.target.value = "";
    });

    // Gestió del Drag and Drop
    const dropZone = wrapper.querySelector("#drop-zone-small");
    if (dropZone) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, preventDefaults, false);
      });
      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(
          eventName,
          () => dropZone.classList.add("drag-over"),
          false
        );
      });
      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(
          eventName,
          () => dropZone.classList.remove("drag-over"),
          false
        );
      });
      dropZone.addEventListener(
        "drop",
        async (event) => {
          const file = event.dataTransfer.files[0];
          if (file) {
            previousFileURL = await processFile(
              file,
              pdfViewer,
              outputTableContainer,
              sendToDbButton,
              previousFileURL
            );
          }
        },
        false
      );
    }
  }
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Funció per crear i retornar el component complet d'Enviar
export function createEnviarComponent() {
  const wrapper = document.createElement("div");
  wrapper.classList.add("enviar-wrapper");

  // 1. COLUMNA ESQUERRA (Dades i Controls)
  const leftColumn = document.createElement("div");
  leftColumn.classList.add("service-column", "data-extraction-column");

  // 1.a Panell de Dades Extretes
  const dataPanel = document.createElement("div");
  dataPanel.classList.add("data-panel");
  dataPanel.innerHTML = `
        <h3>Dades Extretes del Document</h3>
        <div id="outputTableContainer">
            <p>
                Els camps s'emplenaran automàticament un cop s'hagi processat el PDF.
            </p>
        </div>
    `;

  // 1.b Àrea de Controls
  const controlsArea = document.createElement("div");
  controlsArea.classList.add("controls-area");
  controlsArea.innerHTML = `
        <input
            type="file"
            id="file_upload"
            accept="application/pdf"
            style="display: none"
        />
        <button onclick="this.previousElementSibling.click()" class="action-button secondary-action-button">
            Carregar Document PDF
        </button>

        <button id="sendToDbButton" class="action-button primary-action-button" style="margin-top: 15px;" disabled>
            Enviar a BBDD (JSON)
        </button>
        <div id="drop-zone-small" class="drop-zone-small">
            <p>Arrossegar PDF aquí</p>
        </div>
    `;

  leftColumn.appendChild(dataPanel);
  leftColumn.appendChild(controlsArea);

  // 2. COLUMNA DRETA (Visualitzador PDF)
  const rightColumn = document.createElement("div");
  rightColumn.classList.add("service-column", "pdf-viewer-column");
  rightColumn.innerHTML = `
        <h3>Visualitzador PDF</h3>
        <div id="pdf_viewer" class="pdf-placeholder">
            <div class="pdf-placeholder-text">Previsualització del Document</div>
        </div>
    `;

  // 3. Afegir les dues columnes al 'wrapper'
  wrapper.appendChild(leftColumn);
  wrapper.appendChild(rightColumn);

  // 4. Configurar els listeners després d'afegir els elements al DOM
  setTimeout(() => setupFileUploadListener(wrapper), 0);

  return wrapper;
}
