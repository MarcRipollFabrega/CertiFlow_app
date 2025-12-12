//-----------------------------------------------------------------------------
// signar.js
// Lògica completa per gestionar la signatura d'un document i avançar el flux.
//-----------------------------------------------------------------------------
const supabase = window.supabaseClient;
const APPLY_SIGNATURE_FUNCTION_URL = window.APPLY_SIGNATURE_FUNCTION_URL;
const NOTIFICATION_FUNCTION_URL = window.NOTIFICATION_FUNCTION_URL;

// =========================================================================
// FUNCIONS AUXILIARS INTERNES
// =========================================================================

/**
 * Funció per obtenir el rol de l'usuari actual des de la BBDD (format 'Tècnic').
 * @returns {string | null}
 */
async function getCurrentUserRoleFromDB() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData, error: userError } = await supabase
    .from("usuaris")
    .select("role")
    .eq("email", user.email)
    .single();

  if (userError || !userData) {
    console.error("Error al obtenir el rol de l'usuari:", userError);
    return null;
  }
  return userData.role;
}

/**
 * Funció per mapejar el rol actual al següent rol necessari.
 * @param {string} currentRoleDB - Rol actual en format BBDD (ex: 'Tècnic').
 * @returns {string} El nom del pròxim rol o 'FINALITZAT'.
 */
function getNextRole(currentRoleDB) {
  switch (currentRoleDB) {
    case "Técnic":
      return "Cap de Secció";
    case "Cap de Secció":
      return "Jurídic";
    case "Jurídic":
      return "Gerent";
    case "Gerent":
      return "FINALITZAT";
    default:
      return undefined;
  }
}

/**
 * Funció per obtenir les dades del pròxim signant segons el rol.
 * @param {string} nextRole - El rol que estem buscant (ex: 'Cap de Secció').
 * @returns {object | null} Les dades de l'usuari o null.
 */
async function getSignerDetailsByRole(nextRole) {
  if (nextRole === "FINALITZAT" || !nextRole) {
    return null;
  }

  const { data, error } = await supabase
    .from("usuaris")
    .select("id, email, nom, nom_departament")
    .eq("role", nextRole)
    .limit(1)
    .single();

  if (error) {
    console.error(`Error cercant usuari amb rol ${nextRole}:`, error);
    throw new Error(`Error al obtenir detalls per al rol ${nextRole}.`);
  }

  return data;
}

/**
 * Funció per cridar la Edge Function de notificació (enviar.js/enviar-notificació).
 */
async function triggerNotificationFunction(
  documentId,
  signerEmail,
  documentTitle
) {
  console.log(
    `Notificant al següent signant: ${signerEmail} per al document ${documentId}`
  );

  const response = await fetch(NOTIFICATION_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      signer_email: signerEmail,
      document_title: documentTitle,
    }),
  });

  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error(
      result.error || "Error desconegut al notificar el pròxim signant."
    );
  }
  return result.message;
}

// =========================================================================
// FUNCIÓ PRINCIPAL EXPORTADA
// =========================================================================

/**
 * Funció principal per gestionar la signatura del document i l'avanç del flux.
 * @param {string} documentId - ID del document.
 * @param {string} signerEmail - Email de l'usuari actual que signa.
 * @param {string} documentTitle - Títol del document per a notificacions.
 */
export async function handleSignDocument(
  documentId,
  signerEmail,
  documentTitle
) {
  const signButton = document.getElementById("signDocumentButton");
  if (signButton) {
    signButton.disabled = true;
    signButton.textContent = "Signant...";
  }

  try {
    // 1. OBTENIR TOKEN D'AUTENTICACIÓ (NOU PAS NECESSARI)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("Sessió no trobada. Si us plau, torna a iniciar sessió.");
    }
    const jwt = session.access_token;

    // 2. Trucada a la Edge Function (APPLY-SIGNATURE)
    const response = await fetch(APPLY_SIGNATURE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`, // 💡 FIX CLAU: ENVIAR EL JWT
      },
      body: JSON.stringify({
        document_id: documentId,
        signer_email: signerEmail,
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(
        `❌ Error HTTP ${response.status}. Detalls: ${JSON.stringify(
          errorDetails
        )}`
      );
    }

    const result = await response.json();
    console.log("Edge Function Response:", result.message);

    // 2. Determinar el rol actual i el següent
    const currentRoleDB = await getCurrentUserRoleFromDB();
    if (!currentRoleDB) {
      throw new Error("No es pot determinar el rol de l'usuari actual (BBDD).");
    }

    const nextRole = getNextRole(currentRoleDB);

    // 3. Gestionar el pròxim pas
    if (nextRole === "FINALITZAT") {
      // 3a. Finalització del flux
      alert(`✅ Document signat correctament i flux FINALITZAT.`);
    } else if (nextRole) {
      // 3b. Avançar al pròxim signant
      const nextSignerDetails = await getSignerDetailsByRole(nextRole);

      if (nextSignerDetails) {
        // 4. Notificar el pròxim signant
        const notificationMessage = await triggerNotificationFunction(
          documentId,
          nextSignerDetails.email,
          documentTitle
        );
        alert(
          `✅ Document signat correctament. Pròxim pas: ${nextRole}. Notificació enviada a ${nextSignerDetails.email}.`
        );
        console.log("Notificació Edge Function:", notificationMessage);
      } else {
        throw new Error(
          `❌ No s'ha trobat cap usuari amb el rol '${nextRole}' per continuar el flux.`
        );
      }
    } else {
      throw new Error(
        `❌ Rol no reconegut: ${currentRoleDB}. El flux no es pot determinar.`
      );
    }
  } catch (error) {
    console.error("Error al signar i avançar el flux:", error);
    alert(`Error al signar i avançar el flux: Error: ${error.message}`);
  } finally {
    // 5. Neteja i recàrrega
    if (signButton) {
      signButton.disabled = false;
      signButton.textContent = "Signar Document";
    }
    setTimeout(() => window.location.reload(), 500);
  }
}
