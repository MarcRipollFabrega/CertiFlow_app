document.addEventListener("DOMContentLoaded", () => {
  // === 1. CONFIGURACIÓ SUPABASE (VALORS NECESSARIS PER A L'SDK) ===

  // 📢 ATENCIÓ: L'URL es manté visible, ja que no és un secret.
  const SUPABASE_URL = "https://eptthzlpezbmfmnhshkj.supabase.co";

  // 📢 ATENCIÓ: La clau ANON ha de ser visible perquè l'SDK funcioni (és una clau pública).
  // SUBSTITUEIX AQUEST VALOR AMB LA TEVA CLAU ANON REAL
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdHRoemxwZXpibWZtbmhzaGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDE4ODIsImV4cCI6MjA3NjIxNzg4Mn0.l_Twgr8Y2sDpmztHVCGiGVrqnIfo8jz58TXTq3kmtD0";

  // URL de la nova funció Edge que gestiona el login
  const LOGIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/api-login`;

  // 🛠️ INICIALITZACIÓ CORREGIDA: L'SDK requereix ambdós valors (URL i ANON KEY)
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
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);

    // Fade out and remove (4 segons)
    setTimeout(() => {
      // ⚠️ IMPORTANT: Amb la crida immediata a loadAppDashboard,
      // el contenidor ha de ser re-injectat i l'objecte 'toast' ha de
      // mantenir la seva referència per a aquest codi.
      toast.style.opacity = "0";
      setTimeout(() => {
        // Comprovar si el toast encara és al DOM (ja que el DOM es canvia)
        if (toast.parentNode) {
          toast.remove();
        }
      }, 500);
    }, 4000);
  }

  // 🛠️ FUNCIÓ MODIFICADA: Carrega l'esquelet del dashboard.
  // S'ha eliminat la lògica del toast d'èxit d'aquí.
  function loadAppDashboard() {
    const appContainer = document.getElementById("app-container");
    if (appContainer) {
      // Preservem el contenidor de toast si existeix (no el sobreescrivim)
      const toastContainer = document.getElementById("toast-container");
      let currentToastContainer = "";
      if (toastContainer) {
        // Això assegura que l'element #toast-container sigui el mateix objecte
        // encara que el seu contingut es canviï.
        currentToastContainer = toastContainer.outerHTML;
      }

      // 1. Canvi de layout (el contenidor principal)
      appContainer.classList.remove("login-container");
      appContainer.classList.add("app-layout");

      // 2. Injecció de l'esquelet HTML del dashboard (amb la capçalera corregida)
      appContainer.innerHTML = `
            <header class="top-app-bar" id="app-header">
                
                <div class="logo-container">
                    <img src="img/logo.png" alt="CertiFlow Logo" class="logo-icon">
                    <div class="app-logo">
                        <span>Certi</span><span class="logo-accent">Flow</span>
                    </div>
                </div>

                <div class="header-actions"> 
                    <label class="toggle-switch" for="theme-toggle">
                        <input type="checkbox" id="theme-toggle" />
                        <span class="slider round"></span>
                    </label>
                </div>
            </header>
            
            <nav class="side-navigation" id="app-nav"></nav>
                
            <main class="main-content-area" id="main-app-content">
                <div class="loading-spinner"></div>
            </main>
            
           <footer class="bottom-app-bar" id="app-footer">
        <div class="footer-info" id="user-info-footer"></div>
        
        <div class="footer-menu-container">
            <ul id="navbar-menu" class="navbar-menu">
                <li data-id="enviar" class="list active"> <a href="#enviar">
                        <span class="icon">📤</span>
                        <span class="text">Enviar</span>
                    </a>
                </li>
                <li data-id="consultar" class="list">
                    <a href="#consultar">
                        <span class="icon">🔍</span>
                        <span class="text">Consultar</span>
                    </a>
                </li>
                <li data-id="admin" class="list">
                    <a href="#admin">
                        <span class="icon">⚙️</span>
                        <span class="text">Admin</span>
                    </a>
                </li>
            </ul>
        </div>
        
        <div class="footer-logout" id="logout-footer-container"></div>
    </footer>
            
            ${currentToastContainer} 
        `;

      // 3. LÒGICA DEL TEMA
      const themeToggle = document.getElementById("theme-toggle");
      const savedTheme = localStorage.getItem("theme");

      // Aplicació de la classe de tema guardada.
      if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        if (themeToggle) themeToggle.checked = true; // Marca el checkbox si és clar
      } else {
        document.body.classList.remove("light-mode");
        if (themeToggle) themeToggle.checked = false; // Desmarca si és fosc (default)
      }

      if (themeToggle) {
        themeToggle.addEventListener("change", () => {
          document.body.classList.toggle("light-mode");

          if (document.body.classList.contains("light-mode")) {
            localStorage.setItem("theme", "light");
          } else {
            localStorage.setItem("theme", "dark");
          }
        });
      }

      // 4. Càrrega del codi del dashboard
      const script = document.createElement("script");
      script.src = "../JS/dashboard.js";
      script.onload = () => {
        // ⚠️ Comprovem que la funció existeixi abans de cridar-la
        if (window.renderDashboard) {
          window.renderDashboard();
        }
      };
      document.body.appendChild(script);
    }
  }

  // === 5. LÒGICA D'AUTENTICACIÓ ===

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

      // =======================================================
      //  CRIDA SEGURA AL EDGE FUNCTION
      // =======================================================
      let data, error;
      let sessionData = null;

      try {
        const response = await fetch(LOGIN_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          error = result;
        } else {
          sessionData = result.session;
          data = result;
        }
      } catch (err) {
        error = {
          message: "Error de connexió amb el servidor d'autenticació.",
        };
        console.error("Fetch Error:", err);
      }
      // =======================================================

      if (error) {
        console.error("Error Edge Function Auth:", error);
        showToast(
          "Error: Credencials incorrectes o l'usuari no existeix.",
          "error"
        );
      } else if (data.user && sessionData) {
        const { error: sessionError } = await supabaseClient.auth.setSession(
          sessionData
        );

        if (sessionError) {
          console.error("Error establint la sessió:", sessionError);
          showToast("Error establint la sessió.", "error");
        } else {
          // 🛠️ 1. MOSTRAR EL TOAST D'ÈXIT IMMEDIATAMENT
          showToast(
            "Inici de sessió correcte! Carregant aplicació...",
            "success"
          );

          setTimeout(() => {
            loadAppDashboard();
          }, 4600);
        }
      } else {
        showToast("Error desconegut durant l'autenticació.", "error");
      }

      loginButton.disabled = false;
      loginButton.textContent = "Accedir";
    });
  }

  checkSession();
});
