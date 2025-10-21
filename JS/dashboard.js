// Aquest script s'executa un cop l'usuari ha iniciat sessió correctament.

const supabase = window.supabaseClient;

/**
 * 1. OBTENIR EL ROL I NOM DE L'USUARI DES DE LA TAULA 'usuaris'
 */
async function getUserRole() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Usuari no trobat. Redireccionant...");
    window.location.reload();
    return null;
  }

  // S'assumeix que la taula 'usuaris' té els camps 'role' i 'nom'
  const { data: userData, error } = await supabase
    .from("usuaris")
    .select("role, nom")
    .eq("id", user.id)
    .single();

  if (error || !userData) {
    console.error("Error al carregar el rol de l'usuari:", error);
    // Si falla, es pot mostrar un missatge a l'usuari
    const mainContent = document.getElementById("main-app-content");
    if (mainContent) {
      mainContent.innerHTML = `<div class="error-message">❌ Error al carregar les dades del perfil.</div>`;
    }
    return null;
  }

  return userData;
}

/**
 * Funció auxiliar per al contingut dinàmic del Dashboard
 */
function getRoleSpecificContent(role) {
  // ... (El teu codi per a targetes segons el rol)
  return `
        <div class="dashboard-menu">
            <a href="#" class="menu-item menu-common">
                <h3>Visualitzar Historial</h3>
                <p>Accedeix a l'historial de documents.</p>
            </a>
            </div>
    `;
}

/**
 * 2. TANCAR SESSIÓ
 */
async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error al tancar la sessió:", error);
  } else {
    window.location.reload();
  }
}

/**
 * 3. MOSTRAR EL CONTINGUT DEL DASHBOARD (Vista Inicial) I PEU DE PÀGINA
 */
async function renderDashboard() {
  // 🛠️ CORRECCIÓ: Moure la cerca dels elements dins de la funció
  const mainContent = document.getElementById("main-app-content");
  const logoutFooterContainer = document.getElementById(
    "logout-footer-container"
  );
  const userInfoFooter = document.getElementById("user-info-footer");

  // Només continuar si tots els elements i el client Supabase existeixen
  if (!supabase || !mainContent || !logoutFooterContainer || !userInfoFooter) {
    console.warn(
      "Render Error: Falten contenidors del Dashboard o client Supabase."
    );
    return;
  }

  const userData = await getUserRole();

  if (!userData) {
    return;
  }

  const { nom, role } = userData;
  const roleClass = `role-${role.replace(/\s/g, "").toLowerCase()}`;
  const userName = nom || "Usuari Desconegut";

  // 1. GENERAR EL CONTINGUT DEL DASHBOARD (MODIFICAT)
  mainContent.innerHTML = `
        <div class="dashboard-wrapper">
            
            <div class="dashboard-body">
                <h3 class="section-title">Accions Ràpides</h3>
                ${getRoleSpecificContent(role)}
            </div>
        </div>
    `;

  // 2. INJECTAR NOM D'USUARI I ROL AL PEU DE PÀGINA
  userInfoFooter.innerHTML = `
        <p class="footer-user-info">
            Usuari: <strong>${userName}</strong> 
            (<span class="${roleClass}">${role.toUpperCase()}</span>)
        </p>
    `;

  // 3. GENERAR EL BOTÓ DE TANCAR SESSIÓ AL PEU
  logoutFooterContainer.innerHTML = `
        <button id="logoutButton" class="logout-button">
            Tancar Sessió
        </button>
    `;

  // 4. Afegir listener al botó de tancar sessió
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

// Inicia el procés de renderització del dashboard
renderDashboard();
