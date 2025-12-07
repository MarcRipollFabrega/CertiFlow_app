/* --------------------------------------------------------------------------
  LÒGICA D'EXTRACCIÓ DE DADES DES DE PDFS DE FACTURES
  -------------------------------------------------------------------------- */ 
  // --------------------------------------------------------------------------
 // CONSTANTS I PATRONS DE RECONEIXEMENT
 // --------------------------------------------------------------------------  
export const KNOWN_PROVIDERS = [
  "Serveis Consultoria Global, SLP",
  "Material Oficina Ràpid, SA",
  "Distribuïdora Tèxtil Mediterrània",
  "Tecno Solucions Innova, SL",
  "Papereria Creativa SL",
];
export const KNOWN_TECNICS = [
  "Laura Ferrer",
  "Marta Lopez",
  "Elena Jimenez",
  "Carla Puig",
  "David Rodriguez",
];
const KNOWN_CITIES = ["VALENCIA", "BARCELONA", "MADRID", "SEVILLA", "VALLÈS"];

// Patró per a preus senzills (amb o sense separadors de milers)
const PRICE_SIMPLE_PATTERN =
  /([0-9]{1,3}(?:[.,\s][0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})/i;
// --------------------------------------------------------------------------
// FUNCIONS D'UTILITAT
// --------------------------------------------------------------------------       
export function renderTable(data, tableContainer) {
  tableContainer.innerHTML = "";
  const table = document.createElement("table");
  const thead = table.createTHead();
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

// Capçaleres
  const headerRow = thead.insertRow();
  data.headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });

  // Dades
  data.rows.forEach((rowData) => {
    const row = tbody.insertRow();
    rowData.forEach((text) => {
      const cell = row.insertCell();
      cell.textContent = text;
    });
  });

  tableContainer.appendChild(table);
}
/**
 * Prepara les dades per a la inserció a la taula 'documents'.
 * @param {object} extractedData - L'objecte de dades extretes (amb .rows).
 * @param {string} filePath - La ruta al Supabase Storage.
 * @param {string} userId - L'ID de l'usuari que envia.
 * @param {string} signerName - El nom del firmant (Tècnic).
 * @returns {object} Un objecte compatible amb la taula 'documents'.
 */
export function prepareDataForDB(extractedData, filePath, userId, signerName) {
  const extractedFlatData = {}; // Objecte aplanat per a la columna data_extreta
  
  // 1. Aplanar les dades com feies abans
  extractedData.rows.forEach((row) => {
    const fieldName = row[0];
    const value = row[1];
    let dbKey = fieldName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[€\(\)\/]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase();
    extractedFlatData[dbKey] = value;
  });
  
  // 2. Afegir el nom del signant a l'objecte JSON (per a la traça/auditoria)
  extractedFlatData.signer_name = signerName;

  // 3. Retornar l'estructura COMPLETA per a la taula 'documents'
  return {
    file_path: filePath,
    enviat_per: userId,
    estat_document: 'Enviat', // Per defecte
    estat_aprovacio: 'Pendent', // Per defecte
    data_extreta: JSON.stringify(extractedFlatData), // Objecte JSON
    // El 'títol' es pot treure de extractedFlatData si existeix
  };
}

// --------------------------------------------------------------------------
// FUNCIONS PRINCIPALS D'EXTRACCIÓ
// --------------------------------------------------------------------------   
async function getFullTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

// Normalització de preus a format numèric amb dos decimals
function normalizePrice(totalStr) {
  if (totalStr === "N/D") {
    return "N/D";
  }
  let value = totalStr;
  const decimalSeparator =
    value.includes(",") && value.match(/,(\d{2})$/)
      ? ","
      : value.includes(".") && value.match(/\.(\d{2})$/)
      ? "."
      : null;
  if (decimalSeparator) {
    const thousandSeparator = decimalSeparator === "," ? "." : ",";

    // 1. Eliminar separadors de milers
    value = value.replace(new RegExp("\\" + thousandSeparator, "g"), "");
    // 2. Canviar el separador decimal per punt
    value = value.replace(decimalSeparator, ".");

    return parseFloat(value).toFixed(2);
  } else {
    // En cas de format irregular, intentar netejar i parsejar
    const cleanedValue = value.replace(/[^0-9.]/g, "");
    if (cleanedValue) {
      return parseFloat(cleanedValue).toFixed(2);
    }
    return "N/D";
  }
}

/**
// Extrau dades específiques d'un fitxer PDF de factura.
 * @returns {Promise<object>} 
 */
// --------------------------------------------------------------------------
// FUNCIONS PRINCIPALS D'EXTRACCIÓ
// --------------------------------------------------------------------------   
export async function extractDataFromPDF(file) {
  let fullText = "";
  try {
    fullText = await getFullTextFromPDF(file);
    fullText = fullText
      .replace(/\u00a0/g, " ")
      .replace(/\s\s+/g, " ")
      .trim();
    console.log(
      "Text extret del PDF (fragment):",
      fullText.substring(0, 300) + "..."
    );
  } catch (error) {
    console.error("Error al carregar o obtenir el text del PDF:", error);
    throw new Error(
      "No s'ha pogut extreure el text del PDF. Assegura't que el fitxer no està corrupte."
    );
  }
  const tempExtracted = {};

  // -------------------------------------------------------------------------
  // 2. LÒGICA D'EXTRACCIÓ DELS CAMPS
  // -------------------------------------------------------------------------

  // a) Data de l'informe (Primer patró de data que es trobi)
  const dateMatch = fullText.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  tempExtracted["Data informe"] = dateMatch ? dateMatch[1] : "N/D";

  // b) Proveïdor
  let foundProvider = "N/D";
  for (const provider of KNOWN_PROVIDERS) {
    if (fullText.toLowerCase().includes(provider.toLowerCase())) {
      foundProvider = provider;
      break;
    }
  }
  // Cas especial per a "VALLÈS"
  if (foundProvider === "N/D") {
    const cityMatch = KNOWN_CITIES.find((city) =>
      fullText.toUpperCase().includes(city)
    );
    if (cityMatch === "VALLÈS") {
      foundProvider = "PROVEÏDOR AMB ADREÇA VALLÈS (Revisar Manualment)";
    }
  }
  tempExtracted["Proveïdor"] = foundProvider;

  // c) Tècnic
  let foundTecnic = "N/D";
  for (const tecnic of KNOWN_TECNICS) {
    if (fullText.toLowerCase().includes(tecnic.toLowerCase())) {
      foundTecnic = tecnic;
      break;
    }
  }
  tempExtracted["Tècnic"] = foundTecnic;

  // d) Títol de l'informe: Captura el títol complet que comença per "INFORME TECNIC."
  const titleDefault = "Títol no trobat, revisió manual necessària";
  let extractedTitle = titleDefault;
  // 1. INTENT DE CAPTURA FORMAL (Patró millorat per ser menys restrictiu)
  // Afegim el text "INFORME TECNIC." a la captura si l'hem trobat.
  const formalTitleMatch = fullText.match(
    /INFORME\s+TECNIC\.\s*(.*?)(?=\n|TÈCNIC|JURIDIC|total|PROVEÏDOR|$)/i
  );

if (formalTitleMatch && formalTitleMatch[1]) {
  // El grup [1] conté la frase completa, p. ex.: "CONTRACTES DERIVATS DE LICITACIONS PREVIES"
  let descriptivePhrase = formalTitleMatch[1].trim().toUpperCase();

  // --- LÒGICA DE TRADUCCIÓ/NORMALITZACIÓ ---

  if (descriptivePhrase.includes("LICITACIONS")) {
    extractedTitle = "LICITACIONS";
  } else if (
    descriptivePhrase.includes("ACORDS MARC") ||
    descriptivePhrase.includes("ACORD MARC")
  ) {
    extractedTitle = "ACORD MARC";
  } else if (
    descriptivePhrase.includes("CONTRACTES MENORS") ||
    descriptivePhrase.includes("MENOR")
  ) {
    extractedTitle = "MENOR";
  } else if (descriptivePhrase.includes("LCSP")) {
    extractedTitle = "NoLCSP";
  }
  // Si no es troba cap paraula clau, extractedTitle es manté com a titleDefault
}

  // 2. FALLBACK A TÍTOL DESCRIPTIU (Manté el codi anterior)
  if (extractedTitle === titleDefault) {
    // Lògica per trobar el valor entre "num mod A" i "total € (sense IVA)"
    const descriptiveMatch = fullText.match(
      /num\s+mod\s+A\:\s*(.*?)\s*total\s+€\s+\(sense\s+IVA\)/i
    );

    if (
      descriptiveMatch &&
      descriptiveMatch[1] &&
      descriptiveMatch[1].trim().length > 0
    ) {
      extractedTitle = descriptiveMatch[1].trim();
    }
  }
  // 3. ASSIGNACIÓ FINAL
  tempExtracted["Titol de l'informe"] = extractedTitle;

  // e) Número Mod A (Robust)
  let numModA = "N/D";
  // 1. Cerca del patró aïllat
  const isolatedModAMatch = fullText.match(/\b([A-D]\d{3})\b/i);
  // Si es troba el patró aïllat, l'utilitzem directament
  if (isolatedModAMatch) {
    numModA = isolatedModAMatch[1].trim().toUpperCase();
  } else {
    // 2. Cerca del patró amb prefix "Num Mod A"
    const prefixedModAMatch = fullText.match(
      /num(?:ero)?\s+mod\s+A[^a-z0-9]*?([A-D]\d{3})/i
    );
    if (prefixedModAMatch) {
      numModA = prefixedModAMatch[1].trim().toUpperCase();
    }
  }
  tempExtracted["Número Mod A"] = numModA;

  // f) Total € (sense IVA) (Robust)
  let totalSenseIVA = "N/D";
  const senseIVAMatch = fullText.match(
    new RegExp(
      "total € \\(sense IVA\\)" + "[^a-z0-9€]*?" + PRICE_SIMPLE_PATTERN.source,
      "i"
    )
  );
  if (senseIVAMatch && senseIVAMatch[1]) {
    totalSenseIVA = senseIVAMatch[1].trim();
  }
  tempExtracted["Total € (sense IVA)"] = normalizePrice(totalSenseIVA);

  // g) Total € (IVA inclòs) (Robust)
  let totalAmbIVA = "N/D";
  const ambIVAMatch = fullText.match(
    new RegExp(
      "total € \\(IVA incl[oó]s\\)" +
        "[^a-z0-9€]*?" +
        PRICE_SIMPLE_PATTERN.source,
      "i"
    )
  );

  if (ambIVAMatch && ambIVAMatch[1]) {
    totalAmbIVA = ambIVAMatch[1].trim();
  }
  tempExtracted["Total € (IVA inclòs)"] = normalizePrice(totalAmbIVA);

  // --------------------------------------------------------------------------
  /// 3. PREPARACIÓ DE LES DADES PER A LA TAULA DINÀMICA
  // --------------------------------------------------------------------------

  // Definim l'ordre final dels camps
  const orderedKeys = [
    "Titol de l'informe",
    "Data informe",
    "Tècnic",
    "Número Mod A",
    "Proveïdor",
    "Total € (sense IVA)",
    "Total € (IVA inclòs)",
  ];

  const finalRows = orderedKeys.map((key) => [
    key,
    tempExtracted[key] || "N/D",
  ]);

  return {
    headers: ["Camp", "Valor"],
    rows: finalRows,
  };
}
