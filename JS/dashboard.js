/***********************************************************************************************************************************/
// aquest fitxer conté la lògica principal del dashboard, incloent la gestió de components dinàmics,
// la càrrega de dades per als selects i el CRUD d'usuaris, així com la gestió de sessions i tancament de sessió.
/***********************************************************************************************************************************/
// Supabase Client i URL de l'Edge Function per eliminar usuaris
const supabase = window.supabaseClient;
const DELETE_USUARIS_FUNCTION_URL = window.DELETE_USUARIS_FUNCTION_URL;
// *************************************************************************
// FUNCIONS DE GESTIÓ DE SESSIÓ I USUARI
// *************************************************************************
async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  // Recarregar la pàgina després de tancar sessió
  if (error) {
    console.error("Error al tancar la sessió:", error);
    // Mostrar missatge d'error a l'usuari
  } else {
    window.location.reload();
  }
}
// Funció per obtenir el rol de l'usuari actual
async function getUserRole() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Comprovar si l'usuari està autenticat
  if (!user) {
    console.error("Usuari no trobat. Redireccionant...");
    window.location.reload();
    return null;
  }
  // Carregar el rol de l'usuari des de la taula 'usuaris'
  const { data: userData, error } = await supabase
    .from("usuaris")
    .select("role, nom")
    .eq("id", user.id)
    .single();
  // Comprovar errors en la consulta
  if (error || !userData) {
    console.error("Error al carregar el rol de l'usuari:", error);
    // Mostrar missatge d'error a l'usuari
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
// Funció per carregar rols des de la taula 'user_roles'
async function loadRolesFunction(selectElement) {
  // Funció per carregar rols (deixem l'original per a compatibilitat)
  if (selectElement) selectElement.innerHTML = "";
  // Afegir opció placeholder
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
// Comprovar errors
    if (error) throw error;
// Mapear els noms dels rols
    const roleNames = rols.map((rol) => rol.role_name);
// Afegir opcions al select
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
// Funció per guardar canvis d'usuari (deixem l'original per a compatibilitat)
async function loadDepartamentsFunction(selectElement) {
  if (selectElement) selectElement.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Selecciona un Departament";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  if (selectElement) selectElement.appendChild(placeholderOption);
// Carregar departaments des de la taula 'departaments'
  try {
    const { data: departaments, error } = await supabase
      .from("departaments")
      .select("nom_departament")
      .order("nom_departament", { ascending: true });
    if (error) throw error;
// Mapear els noms dels departaments
    const departamentNames = departaments.map((dpt) => dpt.nom_departament);
// Afegir opcions al select
    if (selectElement) {
      departamentNames.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        selectElement.appendChild(option);
      });
    }
    return departamentNames;
    // Comprovar errors
  } catch (error) {
    console.error("❌ Error carregant departaments des de la BD:", error);
    if (selectElement)
      placeholderOption.textContent = "❌ Error al carregar departaments";
    return [];
  }
}


/**
// Funció per carregar la llista d'usuaris amb cerca avançada
 * @param {string} searchTerm 
 * @returns {Array<Object>}
 */
async function loadUsuarisList(searchTerm = "") {
  let query = supabase
    .from("usuaris")
    .select("id, nom, email, role, nom_departament")
    .order("nom", { ascending: true }); 
// Ordenar per nom d'usuari
  if (searchTerm) {
    // Construir el patró de cerca per ILIKE
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
// Afegir condicions OR per a múltiples camps
    query = query.or(
      `nom.ilike.${searchPattern}, email.ilike.${searchPattern}, role.ilike.${searchPattern}, nom_departament.ilike.${searchPattern}`
    );
  }
// Executar la consulta
  const { data, error } = await query;
// Comprovar errors
  if (error) {
    console.error("Error al carregar la llista d'usuaris:", error);
    // Mostrar missatge de l'error RLS a la consola
    if (error.code === "42501") {
      console.error("Error RLS: Potser no tens permisos per llegir la taula.");
    }
    return [];
  }
  return data;
}
// Funció per guardar canvis d'usuari
async function saveUserChangesFunction(email, updatedFields) {
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
// Comprovar errors
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
// Funció per eliminar un usuari per email (de les dues taules)
 * @param {string} email 
 * @returns {Promise<boolean>} 
 */
async function deleteUserByEmailFunction(email) {
  if (!email) {
    console.error("Email de supressió no proporcionat.");
    return false;
  }

 // =======================================================
  // 1. ELIMINAR L'USUARI DE LA TAULA PUBLIC.USUARIS
  // =======================================================  
  try {
    const { error: dbError } = await supabase
      .from("usuaris")
      .delete()
      .eq("email", email);
// Comprovar errors
    if (dbError) {
      console.error(
        `❌ Error al eliminar l'usuari ${email} de public.usuaris (RLS o BD):`,
        dbError.message
      );
     // Si falla aquesta part, no intentem eliminar de auth.users
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
// 2. ELIMINAR L'USUARI DE LA TAULA AUTH.USERS VIA EDGE FUNCTION  
//======================================================
// Crida a l'Edge Function per eliminar l'usuari d'auth.users
  try {
    const sessionData = (await supabase.auth.getSession()).data.session;
    if (!sessionData) {
      console.error("No hi ha sessió activa per obtenir el token.");
      return false;
    }
    const token = sessionData.access_token;
// Crida a l'Edge Function
    const response = await fetch(DELETE_USUARIS_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: email }), 
    });
// Processar la resposta
    const result = await response.json();
// Comprovar errors
    if (!response.ok || result.error) {
      console.error(
        `❌ Error a l'eliminar de auth.users (Edge Function):`,
        result.error || "Resposta Edge Function no OK"
      );
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
// Funció per carregar un fitxer CSS dinàmicament

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
// FUNCIONS DE CÀRREGA DINÀMICA DE COMPONENTS DINS DE L'ADMIN
// ***************************************************************
/**
 // Funció per carregar el contingut de la pestanya Usuaris
 * @param {HTMLElement} container 
 * @param {function} reloadCallback 
 */
async function loadUsuarisTabContent(container, reloadCallback) {
// Mostrar Spinner de càrrega
  const allRoles = await loadRolesFunction();
  const allDepartaments = await loadDepartamentsFunction();

// Netejar el contenidor
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
// Funció per carregar subcomponents dins de l'Admin segons la pestanya seleccionada
 * @param {string} tabName 
 * @param {HTMLElement} tabContentContainer 
 */
async function loadAdminSubComponent(tabName, tabContentContainer) {
  // 1. Mostrar Spinner de Càrrega
  tabContentContainer.innerHTML = `<div class="loading-spinner"></div>`;

 // 2. Actualitzar l'estat actiu dels botons de pestanya
  const tabButtons = document.querySelectorAll(".admin-tabs .tab-button");
  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    }
  });

 // 3. Carregar el contingut segons la pestanya
  try {
    switch (tabName) {
      case "usuaris":
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
// FUNCIONS DE CÀRREGA DINÀMICA DE COMPONENTS DEL DASHBOARD
// ***************************************************************    
/**
 // Funció per carregar components dinàmics dins del dashboard
 * @param {string} componentName 
 */
// Carrega components dinàmics dins del dashboard
async function loadComponent(componentName) {
  const mainContent = document.getElementById("main-app-content");
  if (!mainContent) return;

 // Netejar contingut existent
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

        // 2. Seleccionar elements rellevants
        const tabButtons = document.querySelectorAll(".admin-tabs .tab-button");
        const tabContentContainer =
          document.getElementById("admin-tab-content");

       // 3. Assignar esdeveniments als botons de pestanya
        tabButtons.forEach((button) => {
          button.addEventListener("click", (e) => {
            const tabName = e.target.getAttribute("data-tab");
            loadAdminSubComponent(tabName, tabContentContainer);
          });
        });

        // 4. Carregar el contingut inicial de la pestanya "Usuaris"
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

// Funció per gestionar la navegació del menú
function handleNavigation(targetId) {
  (async () => {
    const navItems = document.querySelectorAll("#navbar-menu .list");
    const newComponent = targetId.replace("#", "");
    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.getAttribute("data-id") === newComponent) {
        item.classList.add("active");
      }
    });
// Carregar el component seleccionat
    await loadComponent(newComponent); 
  })();
}

// ***************************************************************
// FUNCIONS PRINCIPALS DEL DASHBOARD
// ***************************************************************  
async function renderDashboard() {
  // Obtenir dades de l'usuari
  const mainContent = document.getElementById("main-app-content");
  const logoutFooterContainer = document.getElementById(
    "logout-footer-container"
  );
  // Comprovar si l'usuari està autenticat i obtenir el seu rol
  const userInfoFooter = document.getElementById("user-info-footer");
  const navbarMenu = document.getElementById("navbar-menu"); // Element ul
  const userData = await getUserRole();
  if (!userData) {
    return;
  }
  // Desestructurar dades d'usuari
  const { nom, role } = userData;
    const roleClass = `role-${role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina accents (Tècnic -> Tecnic)
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
// Crear el layout del dashboard
  const adminMenuItem = document.querySelector(
    '#navbar-menu .list[data-id="admin"]'
  );
// Mostrar o ocultar l'element de menú d'admin segons el rol
  if (adminMenuItem) {
    if (roleClass === "role-compres") {
      console.log("Accés concedit. Rol detectat: " + roleClass);
      adminMenuItem.classList.remove("visually-hidden");
    } else {
      console.log("Accés denegat. Rol detectat: " + roleClass);
      adminMenuItem.classList.add("visually-hidden");
    }
  }// Crear el layout del dashboard
  const userName = nom || "Usuari Desconegut";

  // 1. CARREGAR EL CONTINGUT PER DEFECTE (ENVIAR)
  const enviarMenuItem = document.querySelector(
    "#navbar-menu .list[data-id='enviar']"
  );
  if (enviarMenuItem) {
    enviarMenuItem.classList.add("active"); 
  }
  await loadComponent("enviar");

 // 2. MOSTRAR INFORMACIÓ DE L'USUARI AL PEU
  userInfoFooter.innerHTML = `
        <p class="footer-user-info">
            Usuari: <strong>${userName}</strong> 
            (<span class="${roleClass}">${role.toUpperCase()}</span>)
        </p>
    `;

 // 3. AFEGIR BOTÓ DE TANCAR SESSIÓ AL PEU
  logoutFooterContainer.innerHTML = `
        <button id="logoutButton" class="logout-button">
            Tancar Sessió
        </button>
    `;

 // 4. AFEGIR LISTENER AL BOTÓ DE TANCAR SESSIÓ
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

// Exportar la funció renderDashboard per a ús extern
window.renderDashboard = renderDashboard;
