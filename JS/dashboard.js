// Aquest script s'executa un cop l'usuari ha iniciat sessió correctament.

const supabase = window.supabaseClient;

/**
 * Funció per tancar la sessió
 */
async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error al tancar la sessió:", error);
    // showToast("Error al tancar la sessió.", "error"); // Assumeix la funció showToast global
  } else {
    // Redireccionar o recarregar per mostrar la pantalla de login
    window.location.reload();
  }
}

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

// ⚠️ Mantenim aquesta funció de moment, però no es fa servir per a la navegació principal
function getRoleSpecificContent(role) {
  return `
        <div class="dashboard-menu">
            <a href="#" class="menu-item menu-common">
                <h3>Visualitzar Historial</h3>
                <p>Accedeix a l'historial de documents.</p>
            </a>
        </div>
    `;
}

// =======================================================
// 🌟🌟 NOU: FUNCIÓ AUXILIAR PER CARREGAR CSS DINÀMICAMENT 🌟🌟
// =======================================================

/**
 * Carrega un fitxer CSS dinàmicament si encara no està carregat.
 * @param {string} href - El path del fitxer CSS (ex: '../CSS/admin.css').
 * @param {string} id - L'ID del link a comprovar/crear (ex: 'admin-styles').
 */
function loadCSS(href, id) {
  if (document.getElementById(id)) {
    return; // Ja carregat, sortir
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = href;
  document.head.appendChild(link);
}

// =======================================================
// 🌟🌟 FUNCIÓ CORREGIDA PER LA CÀRREGA DE COMPONENTS 🌟🌟
// =======================================================

/**
 * Funció per carregar components dinàmicament
 * @param {string} componentName - Nom del component a carregar ('enviar', 'consultar', 'admin').
 */
async function loadComponent(componentName) {
  const mainContent = document.getElementById("main-app-content");
  if (!mainContent) return;

  // Netegem el contingut principal
  mainContent.innerHTML = "";

  // Netegem l'script de lògica d'enviament si està carregat (per si l'usuari navega fora i torna)
  const dynamicScript = document.getElementById("submit-logic-script");
  if (dynamicScript) {
    dynamicScript.remove();
  }

  // Casos de Càrrega
  switch (componentName) {
    case "enviar":
      try {
        // Importem dinàmicament el mòdul 'enviar.js'
        const EnviarModule = await import("../JS/enviar.js");

        // 1. Creem l'element component
        const enviarElement = EnviarModule.createEnviarComponent();

        // 2. Injectem el DOM al contenidor principal
        mainContent.appendChild(enviarElement);
      } catch (error) {
        console.error("Error al carregar el component Enviar:", error);
        mainContent.innerHTML = `<div class="error-message">❌ Error al carregar el formulari d'enviament. Assegura't que 'enviar.js' sigui un mòdul vàlid (export function...).</div>`;
      }
      break;

    case "consultar":
      mainContent.innerHTML = `
                <div class="dashboard-wrapper">
                    <h2 class="section-title">Opcio CONSULTAR</h2>
                    <p>Has fet clic a 🔍 **CONSULTAR**. Aquí anirà la taula de cerca d'historials.</p>
                </div>`;
      break;

    case "admin":
      // 🌟🌟 MODIFICACIÓ CLAU PER AL LAYOUT DE 4 PARTS 🌟🌟
      try {
        // 1. Carregar el full d'estils d'administració
        loadCSS("../CSS/admin.css", "admin-styles");

        // 2. Injectar l'esquelet del layout d'administració (4 columnes/quadrants)
        mainContent.innerHTML = `
                <div class="admin-wrapper">
                    <h2 class="section-title">Administració del Sistema</h2>

                    <div class="admin-grid-layout">
                        
                        <div class="admin-quadrant admin-quadrant-1" id="altaUsuarisContainer">
                            </div>
                        
                        <div class="admin-quadrant admin-quadrant-2">
                            <h3 class="crud-title">Taula de Llistat d'Usuaris</h3>
                            <p>Aquí anirà el llistat d'usuaris amb opcions d'edició i eliminació.</p>
                        </div>
                        
                        <div class="admin-quadrant admin-quadrant-3">
                            <h3 class="crud-title">Gestió de Rols</h3>
                            <p>Eines per crear, modificar i assignar rols.</p>
                        </div>
                        
                        <div class="admin-quadrant admin-quadrant-4">
                            <h3 class="crud-title">Monitorització</h3>
                            <p>Logs i estadístiques d'ús del sistema (Edge Functions, etc.).</p>
                        </div>
                    </div>
                </div>
            `;

        // 3. Carregar el mòdul del CRUD i injectar-lo al quadrant 1
        // (Això requereix que el fitxer 'alta-usuaris-crud.js' existeixi)
        const AltaUsuarisModule = await import("../JS/alta-usuaris-crud.js");
        const crudElement = AltaUsuarisModule.createAltaUsuarisCRUD();

        const altaContainer = document.getElementById("altaUsuarisContainer");
        if (altaContainer) {
          altaContainer.appendChild(crudElement);
        }
      } catch (error) {
        console.error("Error al carregar el component Admin o CRUD:", error);
        mainContent.innerHTML = `<div class="error-message">❌ Error al carregar la vista d'Administració. Verifica la ruta o el contingut de 'alta-usuaris-crud.js'.</div>`;
      }
      break;

    default:
      mainContent.innerHTML = `<div class="error-message">Pàgina no trobada (${componentName}).</div>`;
      break;
  }
}

/**
 * GESTOR DE NAVEGACIÓ
 */
function handleNavigation(targetId) {
  // Aquesta funció s'ha de fer 'async' ja que crida a 'loadComponent' que ara és 'async'
  (async () => {
    const navItems = document.querySelectorAll("#navbar-menu .list");
    const newComponent = targetId.replace("#", "");

    // 1. Eliminar 'active' de tots i afegir-lo al seleccionat
    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.getAttribute("data-id") === newComponent) {
        item.classList.add("active");
      }
    });

    // 2. Carregar el component corresponent
    await loadComponent(newComponent); // 🌟 Crida asíncrona
  })();
}

// =======================================================
// 3. MOSTRAR EL CONTINGUT DEL DASHBOARD (Vista Inicial) I PEU DE PÀGINA
// =======================================================

/**
 * Funció principal que configura el dashboard
 */
async function renderDashboard() {
  const mainContent = document.getElementById("main-app-content");
  const logoutFooterContainer = document.getElementById(
    "logout-footer-container"
  );
  const userInfoFooter = document.getElementById("user-info-footer");
  const navbarMenu = document.getElementById("navbar-menu"); // Element ul

  // ... (Validacions d'elements HTML - ometrem-les aquí per brevetat)

  const userData = await getUserRole();

  if (!userData) {
    return;
  }

  const { nom, role } = userData;
  const roleClass = `role-${role.replace(/\s/g, "").toLowerCase()}`;
  const userName = nom || "Usuari Desconegut";

  // 1. CARREGAR EL CONTINGUT PER DEFECTE (ENVIAR)
  const enviarMenuItem = document.querySelector(
    "#navbar-menu .list[data-id='enviar']"
  );
  if (enviarMenuItem) {
    enviarMenuItem.classList.add("active"); // Assegura que l'element de menú estigui actiu
  }
  await loadComponent("enviar"); // ⬅️ Carrega el contingut inicial del component "enviar"

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

  // 5. AFEGIR LISTENERS DE NAVEGACIÓ AL MENÚ
  navbarMenu.addEventListener("click", (e) => {
    const listItem = e.target.closest(".list");
    if (listItem) {
      const anchor = listItem.querySelector("a");
      if (anchor) {
        const targetId = anchor.getAttribute("href");
        e.preventDefault();
        handleNavigation(targetId); // GESTIONA EL CANVI DE PANTALLA
      }
    }
  });
}

// Exposem la funció al global per ser cridada des de main.js
window.renderDashboard = renderDashboard;
