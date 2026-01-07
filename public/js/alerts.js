// Función para mostrar alertas personalizadas
function mostrarAlerta(mensaje, tipo = 'success') {
    const alertaDiv = document.createElement('div');
    alertaDiv.className = `custom-alert ${tipo}`;
    alertaDiv.innerHTML = `
        <div class="alert-content">
            <i class="bi ${tipo === 'success' ? 'bi-check-circle' : 
                          tipo === 'error' ? 'bi-x-circle' : 
                          'bi-exclamation-triangle'} me-2"></i>
            ${mensaje}
        </div>
        <button type="button" class="btn-close btn-close-white ms-3" onclick="this.parentElement.remove()"></button>
    `;
    document.body.appendChild(alertaDiv);
    setTimeout(() => alertaDiv.remove(), 5000);
}

// Reemplazar el alert nativo
window.alert = function(mensaje) {
    mostrarAlerta(mensaje, 'warning');
}; 