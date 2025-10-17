document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toastContainer = document.getElementById("toast-container");

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

  // Funció que simula les comprovacions de validació del backend de Supabase
  function validateCredentials(email, password) {
    // 1. Comprovació de format de correu electrònic (bàsica, el HTML ja fa la validació de patró)
    if (!email || !email.includes("@") || email.length < 5) {
      return {
        error: true,
        message: "El format del correu electrònic no és vàlid.",
      };
    }

    // 2. Comprovació de seguretat de contrasenya (simulació de Supabase)
    // La contrasenya ha de tenir almenys 8 caràcters.
    if (!password || password.length < 8) {
      return {
        error: true,
        message: "La contrasenya ha de tenir almenys 8 caràcters.",
      };
    }

    // 3. Simulació d'usuari inexistent / credencials incorrectes
    // Podem simular un error comú si l'email és "test@error.com"
    if (email.toLowerCase() === "error@prova.cat") {
      return {
        error: true,
        message:
          "Credencials incorrectes. Usuari no trobat o contrasenya errònia.",
      };
    }

    // 4. Tot correcte
    return {
      error: false,
      message: "Inici de sessió correcte! Redireccionant...",
    };
  }

  // Funció per gestionar l'estat 'valid' per al floating label
  function updateValidationClass(inputElement) {
    if (inputElement.value.trim() !== "") {
      // Mantenir l'etiqueta a dalt si té valor
      inputElement.classList.add("valid");
    } else {
      // Treure la classe si està buit
      inputElement.classList.remove("valid");
    }
  }

  // Afegir event listeners per a la lògica de 'Floating Label' (mantindre's a dalt)
  [emailInput, passwordInput].forEach((input) => {
    // En carregar la pàgina (per si el navegador autocompleta)
    updateValidationClass(input);

    // Quan l'usuari escriu o canvia el valor
    input.addEventListener("input", () => updateValidationClass(input));
    input.addEventListener("blur", () => updateValidationClass(input)); // També al sortir del focus
  });

  // Gestió de l'enviament del formulari
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Netejar missatges anteriors (opcional, el toast ja desapareix)
    // ...

    // Realitzar les comprovacions de validació
    const result = validateCredentials(email, password);

    if (result.error) {
      showToast(result.message, "error");
      // Si hi ha error, no fem res més
    } else {
      // Tot correcte
      showToast(result.message, "success");

      // Simular la càrrega d'un nou JavaScript (com has demanat)
      setTimeout(() => {
        // Aquí normalment faries window.location.href = '/dashboard.html';
        // Com que has demanat que carregui un javascript nou, ho simulem:
        console.log("Simulant càrrega de nou JavaScript 'dashboard.js'");

        const script = document.createElement("script");
        script.src = "dashboard.js";
        document.body.appendChild(script);

        // Opcional: Deshabilitar el formulari o redireccionar
        loginForm.style.pointerEvents = "none";
      }, 2000); // Esperar 2 segons perquè l'usuari vegi el missatge d'èxit
    }
  });

  // Simular el contingut de 'dashboard.js' (crea aquest fitxer al projecte si vols)
  /* window.onload = function() {
        console.log("El nou script 'dashboard.js' s'ha carregat i executat.");
        // alert("Dashboard carregat!"); 
    };
    */
});
