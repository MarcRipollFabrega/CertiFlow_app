import { createEnviarComponent } from "./enviar.js";

document.addEventListener("DOMContentLoaded", () => {
  // Referències globals
  const navbarMenu = document.getElementById("navbar-menu");
  const mainContent = document.getElementById("main-content");
  const themeToggle = document.getElementById("theme-toggle");
  const menuListItems = navbarMenu.querySelectorAll(".list");

  // NOU: Referències al botó i al contenidor principal
  const menuToggleButton = document.getElementById("menu-toggle-button");
  const navigationContainer = document.querySelector(".navigation-container");

  // ====================================================
  // A. Funcions de Creació de Components (Router)
  // ====================================================

  function createConsultarComponent() {
    const component = document.createElement("section");
    component.classList.add("service-section");
    component.innerHTML = `
            <div class="service-column">
                <h3>Consultar Certificats 🔍</h3>
                <p>Cercador de certificats per ID, data o usuari.</p>
                <input type="text" placeholder="Introdueix ID del certificat" class="form-input">
                <button class="action-button primary-action-button">Cercar</button>
                <div class="data-view">Resultats de la cerca...</div>
            </div>
            <div class="service-column pdf-viewer-column-inverted">
                <h3>Informació del Certificat</h3>
                <p>Detall del certificat seleccionat.</p>
                <div class="pdf-placeholder">Detalls / PDF</div>
            </div>
        `;
    return component;
  }

  function createAdminComponent() {
    const component = document.createElement("section");
    component.classList.add("service-section");
    component.innerHTML = `
            <div class="service-column">
                <h3>Panell d'Administració ⚙️</h3>
                <p>Gestió d'usuaris, proveïdors i configuració del sistema.</p>
                <button class="action-button secondary-action-button">Gestionar Usuaris</button>
                <button class="action-button secondary-action-button">Configuració</button>
            </div>
            <div class="service-column">
                <h3>Logs del Sistema</h3>
                <div class="data-view">Dades de registre...</div>
            </div>
        `;
    return component;
  }

  function createSortirComponent() {
    const component = document.createElement("section");
    component.classList.add("service-section", "single-column-section");
    component.innerHTML = `
            <h3>Sortir del Sistema 🚪</h3>
            <p>Gràcies per utilitzar CertiFlow.</p>
            <button class="action-button primary-action-button">Tancar Sessió</button>
        `;
    return component;
  }

  function loadComponent(id) {
    mainContent.innerHTML = "";
    let componentToLoad;

    switch (id) {
      case "enviar":
        componentToLoad = createEnviarComponent();
        break;
      case "consultar":
        componentToLoad = createConsultarComponent();
        break;
      case "admin":
        componentToLoad = createAdminComponent();
        break;
      case "sortir":
        componentToLoad = createSortirComponent();
        break;
      default:
        componentToLoad = createEnviarComponent();
    }
    mainContent.appendChild(componentToLoad);
  }

  // Càrrega inicial del component 'Enviar'
  loadComponent("enviar");

  // ====================================================
  // B. LÒGICA DE TEMA CLAR/FOSC
  // ====================================================

  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    const isLightMode = document.body.classList.contains("light-mode");
    themeToggle.checked = isLightMode;
    localStorage.setItem("theme", isLightMode ? "light" : "dark");
  }

  // Comprovar la preferència de l'usuari a l'inici
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.checked = true;
  } else {
    themeToggle.checked = false;
  }
  themeToggle.addEventListener("change", toggleTheme);

  // ====================================================
  // C. LÒGICA DEL MENÚ DE NAVEGACIÓ
  // ====================================================

  function moveIndicator(targetListItem) {
    const activeItem = document.querySelector(".navigation ul li.active");
    if (activeItem) {
      activeItem.classList.remove("active");
    }
    targetListItem.classList.add("active");
  }

  // NOU: Funció per amagar/mostrar el menú
  function toggleMenuVisibility() {
    // 1. Alternar la classe 'hidden-menu' al contenidor del menú
    navigationContainer.classList.toggle("hidden-menu");

    // 2. Alternar la classe 'menu-hidden' al body per ajustar el padding
    document.body.classList.toggle("menu-hidden");

    // 3. Canviar la icona del botó
    if (navigationContainer.classList.contains("hidden-menu")) {
      // Està amagat, canviem la fletxa a cap amunt
      menuToggleButton.innerHTML = "▲";
    } else {
      // Està visible, canviem la fletxa a cap avall
      menuToggleButton.innerHTML = "▼";
    }
  }

  // ====================================================
  // D. LISTENERS D'ESDEVENIMENTS I CÀRREGA INICIAL
  // ====================================================

  // Router Listener
  menuListItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();

      const componentId = item.dataset.id;

      loadComponent(componentId);

      moveIndicator(item);
    });
  });

  // NOU: Listener per al botó d'amagar/mostrar
  menuToggleButton.addEventListener("click", toggleMenuVisibility);
});
