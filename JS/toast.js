// Fitxer: ../JS/toast.js

/**
 * Funció global per mostrar missatges de notificació (Toasts).
 * Aquesta funció assumeix que teniu un contenidor per a missatges (ex: #toast-container)
 * i estils CSS definits per a les classes 'toast' i 'success'/'error'/'info'.
 *
 * @param {string} message - El text del missatge a mostrar.
 * @param {('success'|'error'|'info')} type - El tipus de missatge per aplicar estils (p. ex., 'success', 'error').
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    // Si el contenidor no existeix, el creem al body
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toast-container';
        document.body.appendChild(newContainer);
        // Hem de tornar a assignar el contenidor
        // 
        return showToast(message, type); 
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Afegir el missatge al contenidor
    container.appendChild(toast);

    // Fer que el toast desaparegui després de 5 segons
    setTimeout(() => {
        toast.classList.add('hide'); // Opcional: per animació de sortida (requereix CSS)
        // Eliminar l'element del DOM després de l'animació o el temps
        toast.addEventListener('transitionend', () => toast.remove());
        
        // Si no hi ha animació de transició, simplement elborrem:
        if (!toast.classList.contains('hide')) {
             toast.remove();
        }
        
    }, 5000);
    
    // Si fas servir una animació CSS, hauràs de cridar a remove() més tard
}