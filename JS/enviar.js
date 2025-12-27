//-----------------------------------------------------------------------------
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

    // IDENTIFICAR EL SIGNANT I EL SEU EMAIL
         const signerRow = extractedData.rows.find((row) => row[0] === "Tècnic");
    if (!signerRow)
      throw new Error("No s'ha trobat el camp 'Tècnic' al document.");

    const signerName = signerRow[1];
    let signerEmail = null;

    // Cerca l'email del signant a la taula 'usuaris'
    const { data: userData, error: userError } = await supabase
      .from("usuaris")
      .select("email")
      .eq("nom", signerName)
      .single();

    if (userError || !userData) {
      console.error(
        "❌ Error: No s'ha trobat l'email del firmant a la taula 'usuaris'.",
        userError
      );
      throw new Error(`Firmant "${signerName}" no trobat a la BBDD.`);
    }

    signerEmail = userData.email;

    //INSERCIÓ AL STORAGE DE SUPABASE
    const fileName = file.name.replace(/\s+/g, "_");
    const filePath = `${userId}_${Date.now()}_${fileName}`;

    const { error: storageError } = await supabase.storage
      .from("documents") // El nom del teu bucket
      .upload(filePath, file);

    if (storageError) throw storageError;

    // INSERCIÓ A LA TAULA 'documents'
        const dbData = prepareDataForDB(
      extractedData,
      filePath,
      userId,
      signerName
    );

    const { data: insertedDoc, error: dbError } = await supabase
      .from("documents")
      .insert(dbData)
      .select("id")
      .single();

    if (dbError) throw dbError;
    const documentId = insertedDoc.id; // ID del document principal

    // INSERCIÓ A LA TAULA 
    const { error: flowError } = await supabase
      .from("documents_sign_flow")
      .insert({
        document_id: documentId,
        signer_name: signerName,
        signer_email: signerEmail,
        status: "Pendent de signatura", 
      });

    if (flowError) throw flowError;

    // CRIDA AL FLUX DE NOTIFICACIÓ 
    await triggerNotificationFunction(documentId, signerEmail);

    // Actualitzar l'estat del botó i reiniciar la pàgina
    sendToDbButton.textContent = "✅ Document enviat i notificació disparada!";
    sendToDbButton.classList.remove("primary-action-button");
    sendToDbButton.classList.add("success-action-button");
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error("Error durant el procés d'enviament:", error);
    // Assegurar-se que el botó es reinicia si hi ha errors
    sendToDbButton.textContent = "❌ Error a l'enviament";
    sendToDbButton.classList.remove("primary-action-button");
    sendToDbButton.classList.add("error-action-button");
    setTimeout(() => {
      sendToDbButton.textContent = "Enviar a BBDD (JSON)";
      sendToDbButton.classList.remove("error-action-button");
      sendToDbButton.classList.add("primary-action-button");
      sendToDbButton.disabled = false;
    }, 3000);
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

  // 1. COLUMNA ESQUERRA (Dades Extretes i Controls)
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
 //Funció auxiliar per cridar la Edge Function de notificació.
async function triggerNotificationFunction(documentId, signerEmail) {
  const NOTIFICATION_FUNCTION_URL = window.NOTIFICATION_FUNCTION_URL;
  
  const response = await fetch(NOTIFICATION_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: documentId,
      signer_email: signerEmail,
    }),
  });

  if (!response.ok) {
    console.error("Error al disparar la Edge Function de notificació.");
  }
}
