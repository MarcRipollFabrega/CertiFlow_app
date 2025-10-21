/**
 * submit_logic.js
 * Aquest script es carrega i executa només quan es fa clic al botó 'Enviar'
 * dins del component Enviar.
 */

(function () {
  // ⚠️ IMPORTANT: Com que aquest script s'executa DINS del context global
  // (després de ser injectat), pot accedir directament als elements del DOM.

  // Mostra una notificació a la consola per confirmar l'execució
  console.log("=========================================");
  console.log("🚀 Lògica d'enviament ('submit_logic.js') iniciada!");

  // Exemple d'obtenció de dades del formulari i acció
  const docType = document.getElementById("doc_type")?.value;
  const proveidor = document.getElementById("proveidor")?.value;

  console.log(`Document a enviar: ${docType}`);
  console.log(`Proveïdor: ${proveidor}`);

  // Aquí aniria la lògica real per validar dades i pujar l'arxiu a Supabase Storage

  // Missatge a la pantalla (utilitzant el sistema de notificacions si el tens)
  if (window.showToast) {
    window.showToast(`Intentant enviar: ${docType} de ${proveidor}`, "info");
  } else {
    alert(`Intentant enviar document: ${docType} (Revisa la consola)`);
  }

  console.log("=========================================");
})();
