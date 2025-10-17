document.addEventListener("DOMContentLoaded", () => {
  // === 1. CONFIGURACIÓ SUPABASE (SUBSTITUEIX AMB ELS TEUS VALORS REALS) ===
  // *** IMPORTANT: Canvieu aquests valors NOMÉS AQUÍ ***
  // Assegureu-vos que aquestes claus són les del vostre projecte Supabase
  const SUPABASE_URL = "https://eptthzlpezbmfmnhshkj.supabase.co"; // ⬅️ SUBSTITUIR AQUÍ
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdHRoemxwZXpibWZtbmhzaGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDE4ODIsImV4cCI6MjA3NjIxNzg4Mn0.l_Twgr8Y2sDpmztHVCGiGVrqnIfo8jz58TXTq3kmtD0"; // ⬅️ SUBSTITUIR AQUÍ

  // Inicialitzar el client de Supabase.
  // Ús de 'window.supabase.createClient' per evitar l'error 'ReferenceError'
  // amb la variable local 'supabase'.
  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  // *** SOLUCIÓ PER A LA DUPLICITAT: Exposar el client Supabase globalment ***
  // Això permet a dashboard.js accedir-hi sense duplicar les claus.
  window.supabaseClient = supabaseClient;

  // === 2. ELEMENTS DEL DOM ===
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toastContainer = document.getElementById("toast-container");
  const appContainer = document.getElementById("app-container");
  const loginButton = document.getElementById("loginButton");

  // === 3. FUNCIONS D'UTILITAT ===

  // Funció per mostrar un missatge Toast (notificació)
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "";
    if (type === "success") {
      icon = "✅";
    } else if (type === "error") {
      icon = "❌";
    }

    toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;

    toastContainer.appendChild(toast);

    // Mostrar amb animació
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // Amagar i eliminar després de 5 segons
    setTimeout(() => {
      toast.classList.remove("show");
      // Esperar la transició abans d'eliminar
      toast.addEventListener("transitionend", () => {
        toast.remove();
      });
    }, 5000);
  }

  // === 4. CÀRREGA DEL DASHBOARD ===

  // Funció per amagar el login i carregar dinàmicament l'script del dashboard
  function loadAppDashboard() {
    // 1. Amagar el formulari de login
    appContainer.style.opacity = 0;
    appContainer.innerHTML = ""; // Eliminar el contingut de login

    // 2. Crear el contenidor principal de l'aplicació
    const mainContent = document.createElement("div");
    mainContent.id = "main-app-content";
    appContainer.appendChild(mainContent);

    // 3. Afegir el nou script (dashboard.js)
    const script = document.createElement("script");

    // 🔥 CORRECCIÓ DE LA RUTA: Afegim 'JS/' perquè el fitxer hi és
    script.src = "JS/dashboard.js";
    script.type = "module"; // Utilitzar mòdul per resoldre l'accés global a 'supabaseClient'
    document.body.appendChild(script);

    // 4. Mostrar el contenidor del dashboard amb transició
    setTimeout(() => {
      appContainer.style.opacity = 1;
    }, 50); // Petit retard per a la transició
  }

  // === 5. GESTIÓ DEL LOGIN ===

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validació bàsica de camps buits
    if (!email || !password) {
      showToast("Tots els camps són obligatoris.", "error");
      return;
    }

    // Deshabilitar el botó mentre processa
    loginButton.disabled = true;
    loginButton.textContent = "Verificant...";

    // 1. Crida a la funció d'autenticació de Supabase
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
      // 2. Inici de sessió exitós
      showToast("Inici de sessió correcte! Carregant aplicació...", "success");

      setTimeout(() => {
        loadAppDashboard();
      }, 1000);
    } else {
      showToast("Error desconegut durant l'autenticació.", "error");
    }

    loginButton.disabled = false;
    loginButton.textContent = "Accedir";
  });

  // === 6. VERIFICAR LA SESSIÓ AL CARREGAR LA PÀGINA ===
  // Això permet a l'usuari mantenir la sessió si refresca la pàgina.
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      // Si la sessió ja existeix, carreguem el dashboard directament
      loadAppDashboard();
    }
  });
});
