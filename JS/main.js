/***********************************************************************************************************************************/
/* arxiu principal JS de l'aplicació: gestiona l'autenticació, la càrrega del dashboard i la lógica de sessions.*/
/***********************************************************************************************************************************/

/*IMPORTACIÓ DE LA LÒGICA DE GESTIÓ DE CONTRASENYA SEGURA*/
import { initializePasswordSetup } from "./password-setup.js";
/*==================================================================*/
document.addEventListener("DOMContentLoaded", () => {
  // === 1. INICIALITZACIÓ DEL CLIENT DE SUPABASE ===
  const SUPABASE_URL = "https://eptthzlpezbmfmnhshkj.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdHRoemxwZXpibWZtbmhzaGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDE4ODIsImV4cCI6MjA3NjIxNzg4Mn0.l_Twgr8Y2sDpmztHVCGiGVrqnIfo8jz58TXTq3kmtD0";
  //Login usuari
  const LOGIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/api-login`;
  //Alta usuari
  const ALTA_USUARIS_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/api-alta`;
  //Delete usuari
  const DELETE_USUARIS_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/api-delete-user`;

  // Edge Function per notificar al signant
  window.NOTIFICATION_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/notify-signer`;
  // Edge Function per gestionar la signatura i el segell del PDF
//const APPLY_SIGNATURE_FUNCTION_URL = "/api-signature";
const APPLY_SIGNATURE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/sign-document-v2`;

  // Inicialització del client de Supabase
  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  // Exposar variables globals per a altres mòduls
  window.ALTA_USUARIS_FUNCTION_URL = ALTA_USUARIS_FUNCTION_URL;
  window.supabaseClient = supabaseClient;
  window.DELETE_USUARIS_FUNCTION_URL = DELETE_USUARIS_FUNCTION_URL;
  window.APPLY_SIGNATURE_FUNCTION_URL = APPLY_SIGNATURE_FUNCTION_URL;

  // === 2. REFERÈNCIES ALS ELEMENTS DEL DOM ===
  const appContainer = document.getElementById("app-container");

  // VISTES INTERCANVIABLES DINS DE .login-right
  const loginView = document.getElementById("loginView"); // Contenidor del Login
  const setPasswordContainer = document.getElementById("setPasswordContainer"); // Contenidor Set Password

  // Elements del formulari de Login
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginButton");

  // Elements del formulari Set Password (mantinguts com a referència)
  const setPasswordForm = document.getElementById("setPasswordForm");
  // === 3. FUNCIONS AUXILIARS ===
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
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 500);
    }, 4000);
  }
  // Funció per carregar el Dashboard
  function loadAppDashboard() {
    // 1. Canvi de l'estructura del DOM per al Dashboard
    if (appContainer) {
      appContainer.classList.remove("login-container");
      appContainer.classList.add("app-layout");
      // 2. Injecta el nou HTML del Dashboard
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
                                <span class="icon"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAACL0lEQVR4nO3T4U8SYRwHcN70qje96i/oD+hPqDe29aboTauYNlaHc25FzCXCxUTJ2RJWmqmo3ANsatMBvpCBGtw6dYyjsgihUemZpYEMC3Ml8Gt3zZu+YDh2d7rpd/vudq8+z/N7nkcmO85xxIqv7+LZoP3yB9Ipj4vdoFNO8PCk9cK5BKnOQsYBYpd0yuNHGJ7qrzo/M3Q1/3n2PuR/DIoCZpMWiIwrIei4srJnx3FSnV19b4LQmAK+zGmhkCIEAX8tdsI7rwrmvSr4zTwvPepiGsG3N8ZdC0AVgbmlLoj66zg0xzzb/xkX0giWIwYIjd3gvuyC9gNufe2B2FQ9N9aNT08qv1z5FAFLIR2EXdXcJIrrJcCVXogH7gDtuQmZjx3C3erttQFIUg3cAtaibVBct/NgInD3P5joEO85/f3eD8mZBgi7a4D21MDbCQzSC48O3zteZQYOBjZ5WmCSfio9bHC1QJvXAi8oM/c/71MxksH+xWnoJK3Q7WuHTNKyKTjc6m4Fo9u0pxhq4mC2PbMEPHQ1FxR2zUlBYZ3LxCOliiIjUOvAo4puzWkOnhu9nmXxSsqE8Vwq1r6lHTUWy8F+duyvbIVbqImSBWyXTrF4pY1N119jaL3m3kjzz7I7fj28ze9YqGAIp+uchtjuKgcb/+ygXRSxidn1FH/GYqbWgS+w6OOXfRsqhHuwXuyE6OgO/GDcnMGQziyTMkqbNnSb0KslRdkorI1nJEfL5R9aCQbRhNnliQAAAABJRU5ErkJggg==" alt="send"></span>
                                <span class="text">Enviar</span>
                            </a>
                        </li>
                        <li data-id="consultar" class="list">
                            <a href="#consultar">
                                <span class="icon"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACcElEQVR4nO2ZT2sTQRjG90tY8Cso1GaTQhEhVHabv8Wbp5LspEWS3WKLvRpvaqu0F5N4M+5+CT3ZP7SieFPBQz3oJl/AtueOPLPZIIXE7e4kO6HzwgvDZBbe38wzzwwZRZEhY/Rh/rbvWR1nz3TtM6vj0FGm6dpnpmvv1rrOIp/iXXtz1EVbg9K1n/KYeRprdu1iaADIJnYA1/kQHsC1TwUAOImyAlSEVCRARwJQ4QDStXWq6oRLps31GADMCQewJl1ClgRwJMDVXoG0tFEibfRq7wFLAjgSYGw2+j+btGI5B8wJB7AiZuXTa1p48YTeKa/S2eIKS7TRh9+EBaj9ektzzx7T5MKQVctUaH6zzsYKBYCC5h8+YkWmchWa36rT8n6DVn+2WaKNwlPZZTZmfm2DfSMMAGYehc3dr1LjY2vgOOOoxcZgbGGrLgYAdA1pYOaHFW/5EIctbyUyFXorU7o5dhu96DzYnOiHbIJC5597K6Zqxs7YbfQiABwG/eWDZmCA0t4r9k1CM75xB7hszi6usGKqx+3A31SP2z7ASewAqVAAb3oA5E/sAH0J7TeCS2i3EVFCHP9eL7ys923xsraramQ7FADeqngBkM//2OhREBtteja6QM5n7pIboQDw0MZTRjhl+wfZEAjjsEmTOe80niuZ75UogYc2rleJtQ3vKpFdZkDQOTY2Em3Ixr9K9PT/fVpfmooG0bWLeKvisScAgX0AOakDL3Pk/HZp9R02b8+FfiQzD64rIgWuB6pm7HhFGqdI1tbItq/5mSy5ltDJV2EhgoSEECWm9aUpf0+ouvEl7npCBSBQfEIjB37nX89J06H01VxaAAAAAElFTkSuQmCC" width= 32px alt="fine-print"></span>
                                <span class="text">Consultar</span>
                            </a>
                        </li>
                        <li data-id="admin" class="list visually-hidden">
                            <a href="#admin">
                                <span class="icon">⚙️</span>
                                <span class="text">Admin</span>
                            </a>
                        </li>
                    </ul>
                </div>
                 <div class="footer-logout" id="logout-footer-container"></div>
            </footer>
        `;

      // 3. LÒGICA DEL TEMA (Ha de venir després de que el DOM s'hagi actualitzat)
      const themeToggle = document.getElementById("theme-toggle");
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        if (themeToggle) themeToggle.checked = true;
      } else {
        document.body.classList.remove("light-mode");
        if (themeToggle) themeToggle.checked = false;
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

      // 4. Càrrega dinàmica del codi del dashboard
      const dashboardScriptId = "dashboard-script";
      if (!document.getElementById(dashboardScriptId)) {
        const script = document.createElement("script");
        script.id = dashboardScriptId;
        script.src = "/JS/dashboard.js";
        script.onload = () => {
          if (window.renderDashboard) {
            window.renderDashboard();
          }
        };
        document.body.appendChild(script);
      } else {
        if (window.renderDashboard) {
          window.renderDashboard();
        }
      }
    }
  }

  // === 4. INICIALITZACIÓ DE LA LÒGICA DE CONFIGURACIÓ DE CONTRASENYA ===
  const isInPasswordSetupMode = initializePasswordSetup(supabaseClient);

  if (isInPasswordSetupMode) {
    console.log(
      "Password Setup mode gestionat amb èxit. S'atura la lògica de checkSession."
    );
    return; // Atura l'execució addicional
  }

  // === 5. FUNCIONS DE GESTIÓ DE SESSIÓ I VISTES ===
  async function checkSession() {
    let session = null;
    let authReady = false;
    return new Promise((resolve) => {
      const { data: listener } = supabaseClient.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (!authReady) {
            session = currentSession;
            authReady = true;
            listener.subscription.unsubscribe();
            resolve();
          }
        }
      );
      setTimeout(() => {
        if (!authReady) {
          supabaseClient.auth
            .getSession()
            .then(({ data }) => {
              session = data.session;
              resolve();
            })
            .catch(resolve);
        }
      }, 500);
    }).then(async () => {
      // 2. HI HA SESSIÓ ACTIVA
      if (session) {
        console.log("Sessió activa. Carregant Dashboard.");
        loadAppDashboard();
      } else {
        // 3. NO HI HA SESSIÓ ACTIVA
        console.log("No hi ha sessió. Mostrant Login.");
        if (loginView) loginView.style.display = "block";
        if (setPasswordContainer) setPasswordContainer.style.display = "none";
      }
    });
  }

  // === 6. GESTIÓ DE L'ESDEVENIMENT DE SUBMISSIÓ DEL FORMULARI DE LOGIN ===
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

      // ==================== CRIDA A L'EDGE FUNCTION D'AUTENTICACIÓ ====================
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
      // ===============================================================================
      // Gestió de la resposta de l'Edge Function
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
          // Inici de sessió correcte
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
