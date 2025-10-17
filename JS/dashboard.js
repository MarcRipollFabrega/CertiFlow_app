// Aquest script s'executa un cop l'usuari ha iniciat sessió correctament.

const supabase = window.supabaseClient;
const mainContent = document.getElementById("main-app-content");

// Comprovem si el client Supabase s'ha carregat correctament
if (!supabase) {
  console.error(
    "ERROR CRÍTIC: El client Supabase no s'ha inicialitzat a script.js."
  );
  if (mainContent) {
    mainContent.innerHTML = `<div class="error-message">❌ Error de configuració. Torna a carregar la pàgina.</div>`;
  }
}

/**
 * 1. OBTENIR EL ROL DE L'USUARI DES DE LA TAULA 'usuaris'
 */
async function getUserRole() {
  // Obtenir la informació de l'usuari autenticat
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error(
      "Usuari no trobat després de l'autenticació. Redireccionant..."
    );
    // Si no hi ha usuari (error de sessió), recarreguem per tornar al login
    window.location.reload();
    return null;
  }

  // Consultem la taula 'usuaris' per obtenir el rol i el nom complet.
  const { data: userData, error } = await supabase
    .from("usuaris")
    .select("role, full_name") // Utilitzem també el nom sencer si existeix
    .eq("id", user.id) // Buscar per ID d'usuari (UUID)
    .single(); // Esperem només una fila

  if (error || !userData) {
    console.error("Error al carregar el rol de l'usuari:", error);
    if (mainContent) {
      mainContent.innerHTML = `<div class="error-message">❌ Error al carregar les dades del perfil.</div>`;
    }
    return null;
  }

  return userData;
}

/**
 * Funció auxiliar per definir els menús d'accés (HTML pur)
 * @param {string} role - El rol de l'usuari
 * @returns {string} HTML amb els elements de menú
 */
function getRoleSpecificContent(role) {
  let content = '<div class="dashboard-menu">';

  // Tots els usuaris veuen aquest menú
  content += `
        <a href="#" class="menu-item menu-common">
            <h3>Visualitzar els meus certificats</h3>
            <p>Accedeix a l'historial de documents generats o rebuts.</p>
        </a>
    `;

  // Contingut específic segons el rol
  switch (role) {
    case "gerent":
      content += `
                <a href="#" class="menu-item menu-accent">
                    <h3>Panell de Gestió Global</h3>
                    <p>Accés a informes, supervisió i configuració de rols d'usuari.</p>
                </a>
                <a href="#" class="menu-item menu-common">
                    <h3>Gestió de Cicle d'Aprovació</h3>
                </a>
            `;
      break;
    case "compres":
      // Aquest és l'usuari administrador inicial. L'enllaç per a la tasca del Pas 5.
      content += `
                <a href="#" class="menu-item menu-highlight" id="adminUsersLink">
                    <h3>Administració d'Usuaris (Compres)</h3>
                    <p>Gestiona altes, baixes i modificació de rols d'accés (el teu rol). </p>
                </a>
                <a href="#" class="menu-item menu-common">
                    <h3>Gestió d'Expedients de Compra</h3>
                </a>
            `;
      break;
    case "cap de seccio":
      content += `
                <a href="#" class="menu-item menu-approve">
                    <h3>Aprovació de Documents de la Secció</h3>
                </a>
            `;
      break;
    case "juridic":
      content += `
                <a href="#" class="menu-item menu-approve">
                    <h3>Revisió i Validació Legal</h3>
                </a>
            `;
      break;
    case "tecnic":
    default:
      content += `
                <a href="#" class="menu-item menu-create">
                    <h3>Creació de Nous Certificats</h3>
                    <p>Inicia el procés de generació de documents.</p>
                </a>
            `;
      break;
  }

  content += "</div>";
  return content;
}

/**
 * 2. MOSTRAR EL CONTINGUT DEL DASHBOARD
 */
async function renderDashboard() {
  if (!supabase) return; // Si no hi ha client, no fem res.

  const userData = await getUserRole();

  if (!userData || !mainContent) {
    return;
  }

  // Crear la classe de rol per als estils CSS (ex: 'role-capdeseccio')
  const roleClass = `role-${userData.role.replace(/\s/g, "").toLowerCase()}`;

  // Netejar el contingut i renderitzar el dashboard
  mainContent.innerHTML = `
        <div class="dashboard-wrapper">
            <header class="dashboard-header">
                <h2>Benvingut/da, ${userData.full_name || "Usuari"}</h2>
                <p>Rol: <span class="role-badge ${roleClass}">${userData.role.toUpperCase()}</span></p>
            </header>
            
            <div class="dashboard-body">
                <h3 class="section-title">Accions Ràpides</h3>
                ${getRoleSpecificContent(userData.role)}
            </div>
            
            <button id="logoutButton" class="logout-button">
                Tancar Sessió
            </button>
        </div>
    `;

  // Afegir listener per tancar la sessió
  document
    .getElementById("logoutButton")
    .addEventListener("click", handleLogout);

  // Afegir listener per a la gestió d'usuaris (Pas 5) si és Compres
  if (userData.role === "compres") {
    const adminLink = document.getElementById("adminUsersLink");
    if (adminLink) {
      adminLink.addEventListener("click", (e) => {
        e.preventDefault();
        // Aquesta alerta es substituirà al Pas 5 pel codi de gestió d'usuaris
        alert(
          "Has clicat a Administració d'Usuaris. Aquesta funció es desenvoluparà al Pas 5."
        );
      });
    }
  }
}

/**
 * 3. TANCAR SESSIÓ
 */
async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error al tancar la sessió:", error);
  } else {
    // Recarregar la pàgina per tornar al formulari de login (index.html)
    window.location.reload();
  }
}

// Inicia el procés de renderització del dashboard
// NOTA: Això es crida quan el script és afegit i carregat per script.js
renderDashboard();
