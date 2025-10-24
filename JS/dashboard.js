// Fitxer: ../JS/dashboard.js

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

// *************************************************************************
// FUNCIONS DE CÀRREGA DE DADES PER ALS SELECTS (IMPLEMENTADES AQUÍ)
// *************************************************************************

/**
 * Carrega els rols de la taula 'user_roles'.
 * @param {HTMLSelectElement} selectElement - El <select> que s'ha d'omplir.
 */
async function loadRolesFunction(selectElement) {
  selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Selecciona un Rol";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  selectElement.appendChild(placeholderOption);

  try {
    const { data: rols, error } = await supabase
      .from("user_roles")
      .select("role_name")
      .order("role_name", { ascending: true });

    if (error) throw error;

    rols.forEach((rol) => {
      const option = document.createElement("option");
      option.value = rol.role_name;
      option.textContent = rol.role_name;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error("❌ Error carregant rols des de la BD:", error);
    placeholderOption.textContent = "❌ Error al carregar rols";
  }
}
/**
 * Carrega els departaments de la taula 'departaments'.
 * @param {HTMLSelectElement} selectElement - El <select> que s'ha d'omplir (adminDepartament).
 */
async function loadDepartamentsFunction(selectElement) {
  selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Selecciona un Departament";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  selectElement.appendChild(placeholderOption);

  try {
    const { data: departaments, error } = await supabase
      .from("departaments")
      .select("nom_departament")
      .order("nom_departament", { ascending: true });

    if (error) throw error;

    departaments.forEach((dpt) => {
      const option = document.createElement("option");
      option.value = dpt.nom_departament;
      option.textContent = dpt.nom_departament;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error("❌ Error carregant departaments des de la BD:", error);
    placeholderOption.textContent = "❌ Error al carregar departaments";
  }
}

// *************************************************************************
// CÀRREGA DE COMPONENTS (Modificació Clau)
// *************************************************************************

/**
 * Funció per carregar el contingut dinàmic (enviar, historial, admin)
 */
async function loadComponent(componentId) {
  const componentContainer = document.getElementById("component-content");
  componentContainer.innerHTML = ""; // Netejar l'antic contingut

  // Per a l'admin necessitem assegurar-nos que l'HTML ja estigui carregat per a la injecció
  if (componentId === "admin") {
    componentContainer.innerHTML = `
            <div class="admin-wrapper">
                <h2 class="section-title">Panell d'Administració</h2>
                <div class="admin-grid-layout">
                    <div class="admin-quadrant admin-quadrant-1">
                        </div>
                    <div class="admin-quadrant admin-quadrant-2">Gestió de Rols / Departaments</div>
                    <div class="admin-quadrant admin-quadrant-3">Activitats Recents</div>
                    <div class="admin-quadrant admin-quadrant-4">Estadístiques</div>
                </div>
            </div>
        `;
  }

  switch (componentId) {
    case "enviar":
      // Lògica per carregar el component "enviar"
      componentContainer.innerHTML = `<h1>Enviar Document</h1>`;
      break;

    case "historial":
      // Lògica per carregar el component "historial"
      componentContainer.innerHTML = `<h1>Historial de Documents</h1>`;
      break;

    case "admin":
      // Importar la funció creadora del CRUD
      const { createAltaUsuarisCRUD } = await import("./altaUsuari.js");

      // ✅ CRIDA CORRECTA: Passem les dues funcions de càrrega
      const altaUsuarisElement = createAltaUsuarisCRUD(
        loadRolesFunction,
        loadDepartamentsFunction
      );

      // Afegir l'element al quadrant corresponent
      const adminQuadrant1 = document.querySelector(".admin-quadrant-1");
      if (adminQuadrant1) {
        adminQuadrant1.appendChild(altaUsuarisElement);
      }
      break;

    default:
      componentContainer.innerHTML = `<h1>Selecciona una opció.</h1>`;
      break;
  }
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
// 🌟🌟 FUNCIÓ AUXILIAR PER CARREGAR CSS DINÀMICAMENT 🌟🌟
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
// 🌟🌟 NOVA FUNCIÓ: CARREGAR ROLS DE LA BASE DE DADES 🌟🌟
// =======================================================

/**
 * Llegeix els rols vàlids de la taula user_roles i omple el <select> donat.
 * @param {HTMLElement} selectElement - L'element <select> a omplir.
 */
async function loadRoles(selectElement) {
  if (!selectElement) return;

  // 1. CONSULTA CORREGIDA (Ja utilitza role_name segons la teva BD)
  const { data, error } = await supabase.from("user_roles").select("role_name"); // ⬅️ Correcte: Selecciona la columna 'role_name'

  selectElement.innerHTML = ""; // Netejar el missatge de 'Carregant'

  if (error) {
    console.error("Error carregant rols de la BD:", error);
    selectElement.innerHTML =
      '<option value="" disabled selected>Error: Cal recarregar</option>';
    return;
  }

  // Afegir l'opció per defecte (Selecciona el rol)
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Selecciona el rol";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  selectElement.appendChild(defaultOption);

  // 2. CORRECCIÓ CLAU: LLEGIR LA PROPIETAT role_name
  data.forEach((roleData) => {
    const option = document.createElement("option");
    // 🚨 CORRECCIÓ AQUÍ: Llegeix 'role_name' en lloc de 'role'
    const roleValue = roleData.role_name;

    option.value = roleValue;
    // Capitalitzar la primera lletra per millorar la visualització
    option.textContent = roleValue.charAt(0).toUpperCase() + roleValue.slice(1);
    selectElement.appendChild(option);
  });
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
      try {
        // 1. Carregar la vista d'administració (inclòs el layout)
        // Utilitzem loadCSS per assegurar-nos que els estils es carreguen.
        // NOTA: Cal que tinguis definida la funció loadCSS al teu dashboard.js
        loadCSS("../CSS/admin.css", "admin-styles");

        // Injectar l'esquelet (sense el contingut del quadrant 1, que es carregarà després)
        mainContent.innerHTML = `
                <div class="admin-wrapper">
                    <h2 class="section-title">Administració del Sistema</h2>
                    <div class="admin-grid-layout">
                        
                        <div class="admin-quadrant admin-quadrant-1" id="altaUsuarisContainer">
                            </div>
                        
                        <div class="admin-quadrant admin-quadrant-2">
                            <h3 class="crud-title">Gestió de Rols / Departaments</h3>
                            <p>Aquí anirà el CRUD de Rols i Departaments.</p>
                        </div>
                   
                        <div class="admin-quadrant admin-quadrant-3">Activitats Recents</div>
                        <div class="admin-quadrant admin-quadrant-4">Estadístiques</div>
                    </div>
                </div>
            `;

        // 3. Carregar el mòdul del CRUD i injectar-lo al quadrant 1

        // 🛑 CORRECCIÓ 1: Ús de la desestructuració per evitar el 'TypeError: ... is not a function'
        // Mantenim la ruta actual, si torna a fallar, prova amb import("../JS/altaUsuari.js")
        const { createAltaUsuarisCRUD } = await import("./altaUsuari.js");

        // 🛑 CORRECCIÓ 2: Passem les dues funcions DEFINIDES CORRECTAMENT a dashboard.js
        const crudElement = createAltaUsuarisCRUD(
          loadRolesFunction, // ✅ Funció de càrrega de rols (el nom correcte)
          loadDepartamentsFunction // ✅ Funció de càrrega de departaments (el nou select)
        );

        const altaContainer = document.getElementById("altaUsuarisContainer");
        if (altaContainer) {
          altaContainer.appendChild(crudElement);
        }
      } catch (error) {
        console.error("❌ ERROR AL CARREGAR EL COMPONENT ADMIN:", error);
        mainContent.innerHTML = `<div class="error-message">❌ **ERROR FATAL** al carregar la vista d'Administració. Verifica la **ruta d'importació** d'altaUsuari.js i el teu **Console (F12)**.</div>`;
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

// Funcions de suport (Necessiten definició real o ser importades al teu projecte)
// *************************************************************************

// AQUESTES FUNCIONS HAN D'EXISTIR. Si no les tens al teu dashboard.js, usa aquest exemple:

function createDashboardLayout(userName, role, roleClass, navItems) {
  // Retorna l'HTML de l'esquelet del dashboard
  return `
        <div class="dashboard-wrapper">
            <nav class="navbar">
                <ul id="navbar-menu">
                   ${navItems
                     .map(
                       (item) =>
                         `<li class="list" data-id="${item.id}">${item.text}</li>`
                     )
                     .join("")}
                </ul>
            </nav>
            <main id="component-content" class="content-area">
                </main>
            <footer class="footer">
                <div id="user-info-footer"></div>
                <div id="logout-footer-container"></div>
            </footer>
        </div>
    `;
}

function getDashboardMenuItems(role) {
  // Retorna els elements de navegació segons el rol
  return [
    { id: "enviar", text: "Enviar", icon: "send" },
    { id: "historial", text: "Historial", icon: "history" },
    ...(role === "Gerent"
      ? [{ id: "admin", text: "Admin", icon: "settings" }]
      : []),
  ];
}

// Exposem la funció al global per ser cridada des de main.js
window.renderDashboard = renderDashboard;
