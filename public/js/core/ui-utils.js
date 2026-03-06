/**
 * ui-utils.js - Utilidades globales de UI
 * - setLoading(btn, loading): maneja estado de carga en botones
 * - validateForm(form): valida campos requeridos y muestra error visual
 * - autoCloseModal(modalId): cierra modal Bootstrap por ID
 */

/**
 * Activa/desactiva estado de carga en un botón.
 * @param {HTMLElement|string} btn - Elemento o selector del botón
 * @param {boolean} loading - true para mostrar spinner, false para restaurar
 */
function setLoading(btn, loading) {
    if (typeof btn === 'string') btn = document.querySelector(btn);
    if (!btn) return;
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Procesando...';
    } else {
        btn.disabled = false;
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
        }
    }
}

/**
 * Valida campos requeridos de un formulario o conjunto de inputs.
 * Marca en rojo los campos vacíos. Retorna true si todo es válido.
 * @param {HTMLElement|string} formOrSelector - Formulario o selector
 * @returns {boolean}
 */
function validateForm(formOrSelector) {
    const form = typeof formOrSelector === 'string'
        ? document.querySelector(formOrSelector)
        : formOrSelector;
    if (!form) return true;

    let valid = true;
    const fields = form.querySelectorAll('[required], [data-required]');
    fields.forEach(function (field) {
        const val = field.value ? field.value.trim() : '';
        if (!val) {
            field.classList.add('is-invalid');
            field.addEventListener('input', function onInput() {
                field.classList.remove('is-invalid');
                field.removeEventListener('input', onInput);
            }, { once: true });
            valid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    return valid;
}

/**
 * Cierra un modal Bootstrap 5 por ID.
 * @param {string} modalId - ID del modal (sin #)
 */
function autoCloseModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    const instance = bootstrap.Modal.getInstance(el);
    if (instance) {
        instance.hide();
    } else {
        try { bootstrap.Modal.getOrCreateInstance(el).hide(); } catch (e) { }
    }
}

/**
 * Muestra una alerta SweetAlert2 de éxito y opcionalmente cierra un modal.
 * @param {string} title
 * @param {string|null} modalId - ID del modal a cerrar (opcional)
 */
function alertSuccess(title, modalId) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'success', title: title, timer: 1600, showConfirmButton: false });
    }
    if (modalId) autoCloseModal(modalId);
}

/**
 * Muestra una alerta SweetAlert2 de error.
 * @param {string} title
 * @param {string} text
 */
function alertError(title, text) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'error', title: title, text: text || '' });
    } else {
        alert((title || 'Error') + (text ? ': ' + text : ''));
    }
}

/**
 * Helper para fetch con manejo de errores estandarizado.
 * @param {string} url
 * @param {string} method
 * @param {Object|null} body
 * @returns {Promise<any>}
 */
async function apiFetch(url, method, body) {
    const opts = {
        method: method || 'GET',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    if (!resp.ok) {
        const err = await resp.json().catch(function () { return {}; });
        throw new Error(err.error || 'Error HTTP ' + resp.status);
    }
    if (method === 'DELETE') return null;
    return resp.json().catch(function () { return null; });
}
