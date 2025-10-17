document.addEventListener("DOMContentLoaded", () => {
  // === 1. CONFIGURACIÓ SUPABASE (SUBSTITUEIX AMB ELS TEUS VALORS REALS) ===
  const SUPABASE_URL = "https://eptthzlpezbmfmnhshkj.supabase.co"; // ⬅️ SUBSTITUIR AQUÍ
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdHRoemxwZXpibWZtbmhzaGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDE4ODIsImV4cCI6MjA3NjIxNzg4Mn0.l_Twgr8Y2sDpmztHVCGiGVrqnIfo8jz58TXTq3kmtD0"; // ⬅️ SUBSTITUIR AQUÍ

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  window.supabaseClient = supabaseClient;

  // === 2. REFERÈNCIES I 3. FUNCIONS AUXILIARS ===
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginButton");

  function showToast(message, type) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.classList.add("toast", `toast-${type}`);
    const icon = type === "success" ? "✔️" : "❌";
    toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 4000);
  }

  // === 4. LÒGICA DE CÀRREGA DE L'APLICACIÓ (CAPÇALERA I LAYOUT) ===

  /**
   * Injecta l'estructura de l'aplicació (Layout Grid) i carrega els scripts.
   */
  function loadAppDashboard() {
    const appContainer = document.getElementById("app-container");

    appContainer.classList.remove("login-container");
    appContainer.classList.add("app-layout");

    // Injectem l'estructura COMPLETA (Capçalera, Contingut i Peu)
    appContainer.innerHTML = `
      <header class="top-app-bar">
          <div class="logo-container">
              <img src="img/logo.png" alt="CertiFlow Logo" class="logo-icon">
              <div class="app-logo">
                  <span>Certi</span><span class="logo-accent">Flow</span>
              </div>
          </div>
          <label class="toggle-switch" for="theme-toggle">
              <input type="checkbox" id="theme-toggle" />
              <span class="slider round"></span>
          </label>
      </header>

      <div id="navigation-container-placeholder"></div>
      
      <main id="main-content" class="main-content-area">
          <div id="main-app-content"></div> 
      </main>

      <footer class="bottom-app-bar">
        <div class="footer-content">
            <div id="user-info-footer"></div> 
            
            <div></div> 
            
            <div id="logout-footer-container"></div>
        </div>
    </footer>
    `;

    // 3. Carregar els scripts de funcionalitat.

    // Funció per carregar la lògica del Tema Fosc/Clar
    setupThemeToggle();

    // Carreguem dashboard.js (obté rol, nom i injecta contingut inicial i informació del footer)
    const dashboardScript = document.createElement("script");
    dashboardScript.src = "JS/dashboard.js";
    document.body.appendChild(dashboardScript);

    // Si tens menu.js i vols començar a provar-lo:
    // const menuScript = document.createElement("script");
    // menuScript.src = "JS/menu.js";
    // menuScript.type = "module";
    // document.body.appendChild(menuScript);
  }

  /**
   * Lògica de canvi de tema (dark/light mode)
   */
  function setupThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    if (!themeToggle) return;

    // Estat inicial: comprovar preferència de l'usuari o emmagatzemament local
    const currentTheme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");

    if (currentTheme === "light") {
      document.body.classList.add("light-mode");
      themeToggle.checked = true;
    } else {
      document.body.classList.remove("light-mode");
      themeToggle.checked = false;
    }

    themeToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
      } else {
        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");
      }
    });
  }

  // === 5. LÒGICA D'AUTENTICACIÓ (Es manté igual) ===

  async function checkSession() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session) {
      loadAppDashboard();
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        showToast("Tots els camps són obligatoris.", "error");
        return;
      }

      loginButton.disabled = true;
      loginButton.textContent = "Verificant...";

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error("Error Supabase Auth:", error);
        showToast(
          "Error: Credencials incorrectes o l'usuari no existeix.",
          "error"
        );
      } else if (data.user) {
        showToast(
          "Inici de sessió correcte! Carregant aplicació...",
          "success"
        );

        setTimeout(() => {
          loadAppDashboard();
        }, 1000);
      } else {
        showToast("Error desconegut durant l'autenticació.", "error");
      }

      loginButton.disabled = false;
      loginButton.textContent = "Accedir";
    });
  }

  checkSession();
});
