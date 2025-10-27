// Fitxer: ../JS/dashboard.js

// Aquest script s'executa un cop l'usuari ha iniciat sessió correctament.

const supabase = window.supabaseClient;
const DELETE_USUARIS_FUNCTION_URL = window.DELETE_USUARIS_FUNCTION_URL;

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
// FUNCIONS DE CÀRREGA DE DADES PER ALS SELECTS I CRUD D'USUARIS
// *************************************************************************

async function loadRolesFunction(selectElement) {
  // Funció per carregar rols (deixem l'original per a compatibilitat)
  if (selectElement) selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Selecciona un Rol";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  if (selectElement) selectElement.appendChild(placeholderOption);

  try {
    const { data: rols, error } = await supabase
      .from("user_roles")
      .select("role_name")
      .order("role_name", { ascending: true });

    if (error) throw error;

    const roleNames = rols.map((rol) => rol.role_name);

    if (selectElement) {
      roleNames.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        selectElement.appendChild(option);
      });
    }
    return roleNames;
  } catch (error) {
    console.error("❌ Error carregant rols des de la BD:", error);
    if (selectElement)
      placeholderOption.textContent = "❌ Error al carregar rols";
    return [];
  }
}

async function loadDepartamentsFunction(selectElement) {
  // Funció per carregar departaments (deixem l'original per a compatibilitat)
  if (selectElement) selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Selecciona un Departament";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  if (selectElement) selectElement.appendChild(placeholderOption);

  try {
    const { data: departaments, error } = await supabase
      .from("departaments")
      .select("nom_departament")
      .order("nom_departament", { ascending: true });

    if (error) throw error;

    const departamentNames = departaments.map((dpt) => dpt.nom_departament);

    if (selectElement) {
      departamentNames.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        selectElement.appendChild(option);
      });
    }

    return departamentNames;
  } catch (error) {
    console.error("❌ Error carregant departaments des de la BD:", error);
    if (selectElement)
      placeholderOption.textContent = "❌ Error al carregar departaments";
    return [];
  }
}

async function loadUsuarisList() {
  // Funció per carregar la llista d'usuaris (deixem l'original per a compatibilitat)
  try {
    const { data: usuaris, error } = await supabase
      .from("usuaris")
      .select("nom, email, role, nom_departament")
      .order("nom", { ascending: true });

    if (error) throw error;

    return usuaris;
  } catch (error) {
    console.error("❌ Error carregant llista d'usuaris des de la BD:", error);
    return [];
  }
}

async function saveUserChangesFunction(email, updatedFields) {
  // Funció per guardar canvis d'usuari (deixem l'original per a compatibilitat)
  if (!email || Object.keys(updatedFields).length === 0) {
    console.error("Dades de guardat incompletes.");
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("usuaris")
      .update(updatedFields)
      .eq("email", email)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn(
        "⚠️ RLS/Permisos: L'actualització NO ha afectat cap fila. L'usuari amb l'email %s no ha pogut ser actualitzat. (O RLS està activada sense permisos)",
        email
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Error actualitzant l'usuari ${email} a Supabase:`, error);
    return false;
  }
}
/**
 * Funció asíncrona per eliminar completament un usuari.
 * 1. Elimina de la taula public.usuaris.
 * 2. Si l'anterior és exitós, crida l'Edge Function per eliminar de auth.users.
 * @param {string} email - L'email de l'usuari a eliminar.
 * @returns {Promise<boolean>} Retorna true si les dues eliminacions són exitoses.
 */
async function deleteUserByEmailFunction(email) {
  if (!email) {
    console.error("Email de supressió no proporcionat.");
    return false;
  }

  // =======================================================
  // 1. ELIMINACIÓ de public.usuaris (Utilitza el client amb RLS)
  // =======================================================
  try {
    const { error: dbError } = await supabase
      .from("usuaris")
      .delete()
      .eq("email", email); 

    if (dbError) {
      console.error(
        `❌ Error al eliminar l'usuari ${email} de public.usuaris (RLS o BD):`,
        dbError.message
      );
      // Retornem false per RLS denegat o error de BD
      return false; 
    }
  } catch (error) {
    console.error(
      `❌ Excepció durant la supressió de public.usuaris de ${email}:`,
      error
    );
    return false;
  }

  // =======================================================
  // 2. CRIDA A EDGE FUNCTION (Eliminació de auth.users amb Service Role)
  // =======================================================
  try {
      // ⚠️ Necessites el token de l'usuari que fa l'acció (que ha de ser 'Compres')
      const sessionData = (await supabase.auth.getSession()).data.session;
      if (!sessionData) {
          console.error("No hi ha sessió activa per obtenir el token.");
          return false;
      }
      const token = sessionData.access_token;

      const response = await fetch(DELETE_USUARIS_FUNCTION_URL, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` // Autentica la crida de l'Edge Function
          },
          body: JSON.stringify({ email: email }) // L'email és el cos de la petició
      });

      const result = await response.json();

      if (!response.ok || result.error) {
          console.error(
              `❌ Error a l'eliminar de auth.users (Edge Function):`, 
              result.error || 'Resposta Edge Function no OK'
          );
          // Si auth falla, retornem false, encara que public.usuaris s'hagi eliminat
          return false; 
      }
      
      // Tot ha anat bé.
      return true; 

  } catch (error) {
      console.error(
          `❌ Excepció durant la crida a l'Edge Function de supressió de ${email}:`,
          error
      );
      return false;
  }
}

// =======================================================
// 🌟🌟 NOVA FUNCIÓ: CARREGAR CSS DINÀMICAMENT 🌟🌟
// =======================================================

function loadCSS(href, id) {
  if (document.getElementById(id)) {
    return;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = href;
  document.head.appendChild(link);
}

// ***************************************************************
// 🌟🌟 NOVES FUNCIONS DE GESTIÓ DE PESTANYES ADMIN 🌟🌟
// ***************************************************************

/**
 * Carrega i injecta el contingut de la pestanya 'Usuaris'.
 * @param {HTMLElement} container - El div #admin-tab-content on injectar.
 * @param {function} reloadCallback - Funció per recarregar el subcomponent (per al CRUD).
 */
async function loadUsuarisTabContent(container, reloadCallback) {
  // 🛑 CARREGUEM LES LLISTES DE ROLS I DEPARTAMENTS
  const allRoles = await loadRolesFunction();
  const allDepartaments = await loadDepartamentsFunction();

  // --- INJECCIÓ DEL LAYOUT GRID D'USUARIS ---
  container.innerHTML = `
        <div class="admin-grid-layout">
            <div class="admin-quadrant admin-quadrant-1" id="altaUsuarisContainer"></div>
            <div class="admin-quadrant admin-quadrant-2" id="llistaUsuarisContainer"></div>
        </div>
    `;

  // --- QUADRANT 1: ALTA D'USUARIS ---
  const { createAltaUsuarisCRUD } = await import("./altaUsuari.js");
  const altaUsuarisElement = createAltaUsuarisCRUD(
    loadRolesFunction,
    loadDepartamentsFunction
  );
  const altaContainer = document.getElementById("altaUsuarisContainer");
  if (altaContainer) {
    altaContainer.appendChild(altaUsuarisElement);
  }

  // --- QUADRANT 2: LLISTAT D'USUARIS ---
  const { createLlistaUsuarisTable } = await import("./llistaUsuaris.js");
  const llistaUsuarisElement = createLlistaUsuarisTable(
    loadUsuarisList,
    allRoles,
    allDepartaments,
    saveUserChangesFunction,
    reloadCallback,
    deleteUserByEmailFunction
  );
  const llistaContainer = document.getElementById("llistaUsuarisContainer");
  if (llistaContainer) {
    llistaContainer.appendChild(llistaUsuarisElement);
  }
}

/**
 * Funció per carregar el contingut dinàmic dins de la secció Admin (Usuaris, Documents, Licitacions).
 * ⚠️ Aquesta funció S'HA DE DECLARAR GLOBALMENT per ser accessible des de loadComponent.
 * @param {string} tabName - El nom de la pestanya a carregar.
 * @param {HTMLElement} tabContentContainer - El contenidor #admin-tab-content.
 */
async function loadAdminSubComponent(tabName, tabContentContainer) {
  // 1. Mostrar Spinner de càrrega
  tabContentContainer.innerHTML = `<div class="loading-spinner"></div>`;

  // 2. Marcar la pestanya activa
  const tabButtons = document.querySelectorAll(".admin-tabs .tab-button");
  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    }
  });

  // 3. CARREGAR CONTINGUT SEGONS LA PESTANYA
  try {
    switch (tabName) {
      case "usuaris":
        // ➡️ Recarreguem la pestanya d'Usuaris passant-li el seu propi callback de recàrrega
        await loadUsuarisTabContent(tabContentContainer, () =>
          loadAdminSubComponent("usuaris", tabContentContainer)
        );
        break;

      case "documents":
        tabContentContainer.innerHTML = `
                    <div class="dashboard-wrapper">
                        <h3 class="section-title">Gestió de Documents</h3>
                        <p>Aquí anirà el formulari i la taula per gestionar els documents.</p>
                    </div>
                `;
        break;

      case "licitacions":
        tabContentContainer.innerHTML = `
                    <div class="dashboard-wrapper">
                        <h3 class="section-title">Gestió de Licitacions</h3>
                        <p>Aquí anirà el formulari i la taula per gestionar les licitacions.</p>
                    </div>
                `;
        break;
    }
  } catch (error) {
    console.error(`❌ ERROR al carregar la pestanya ${tabName}:`, error);
    tabContentContainer.innerHTML = `<div class="error-message">❌ Error al carregar el contingut d'aquesta pestanya.</div>`;
  }
}

// ***************************************************************
// FUNCIÓ PRINCIPAL DE CÀRREGA DE COMPONENTS (loadComponent)
// ***************************************************************

/**
 * Funció per carregar components dinàmicament
 * @param {string} componentName - Nom del component a carregar ('enviar', 'consultar', 'admin').
 */
async function loadComponent(componentName) {
  const mainContent = document.getElementById("main-app-content");
  if (!mainContent) return;

  // Netegem el contingut principal
  mainContent.innerHTML = "";

  // Netegem l'script de lògica d'enviament si està carregat
  const dynamicScript = document.getElementById("submit-logic-script");
  if (dynamicScript) {
    dynamicScript.remove();
  }

  // Casos de Càrrega
  switch (componentName) {
    case "enviar":
      try {
        const EnviarModule = await import("./enviar.js"); // Assumeix la ruta correcta
        const enviarElement = EnviarModule.createEnviarComponent();
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
        loadCSS("../CSS/admin.css", "admin-styles");

        // 1. Injecció de l'esquelet de la vista Admin (Pestanyes + Contenidor Dinàmic)
        mainContent.innerHTML = `
                <div class="admin-wrapper">
                    <h2 class="section-title">Administració del Sistema</h2>
                    
                    <nav class="admin-tabs">
                        <button class="tab-button active" data-tab="usuaris">Usuaris</button>
                        <button class="tab-button" data-tab="documents">Documents</button>
                        <button class="tab-button" data-tab="licitacions">Licitacions</button>
                    </nav>
                    
                    <div id="admin-tab-content">
                        <div class="loading-spinner"></div>
                    </div>
                    
                </div>
            `;

        // 2. OBTENIR REFERÈNCIES I AFEGIR LISTENERS
        const tabButtons = document.querySelectorAll(".admin-tabs .tab-button");
        const tabContentContainer =
          document.getElementById("admin-tab-content");

        // 3. Afegir el listener per canviar de pestanya
        tabButtons.forEach((button) => {
          button.addEventListener("click", (e) => {
            const tabName = e.target.getAttribute("data-tab");
            // ➡️ Crida la funció que s'encarregarà de canviar el contingut
            loadAdminSubComponent(tabName, tabContentContainer);
          });
        });

        // 4. Carregar la pestanya per defecte (Usuaris)
        await loadAdminSubComponent("usuaris", tabContentContainer);
      } catch (error) {
        console.error("❌ ERROR AL CARREGAR EL COMPONENT ADMIN:", error);
        mainContent.innerHTML = `<div class="error-message">❌ **ERROR FATAL** al carregar la vista d'Administració. Verifica les rutes dels mòduls i el teu Console (F12).</div>`;
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

// ***************************************************************
// 3. MOSTRAR EL CONTINGUT DEL DASHBOARD (Vista Inicial) I PEU DE PÀGINA
// ***************************************************************

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

  const userData = await getUserRole();

  if (!userData) {
    return;
  }

  const { nom, role } = userData;
  const roleClass = `role-${role.replace(/\s/g, "").toLowerCase()}`;

  const adminMenuItem = document.querySelector(
    '#navbar-menu .list[data-id="admin"]'
  );

  if (adminMenuItem) {
    if (roleClass === "role-compres") {
      console.log("Accés concedit. Rol detectat: " + roleClass);
      adminMenuItem.classList.remove("visually-hidden");
    } else {
      console.log("Accés denegat. Rol detectat: " + roleClass);
      adminMenuItem.classList.add("visually-hidden");
    }
  }

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

// *************************************************************************
// Funcions de suport (Les teves funcions de mock, si les necessites)
// *************************************************************************

function createDashboardLayout(userName, role, roleClass, navItems) {
  // ...
}

function getDashboardMenuItems(role) {
  // ...
}

// Exposem la funció al global per ser cridada des de main.js
window.renderDashboard = renderDashboard;
