/**
 * AlertManager - Centralized alert/notification management
 * Provides consistent user feedback across the application
 * Related to: All views that need user feedback
 */

class AlertManager {
    /**
     * Show a simple alert (using browser alert)
     * @param {string} message - Alert message
     * @param {string} type - Alert type (info, warning, error)
     */
    static alert(message, type = 'info') {
        alert(message);
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} User's choice
     */
    static confirm(message, title = 'Confirmar') {
        return new Promise((resolve) => {
            const result = confirm(message);
            resolve(result);
        });
    }

    /**
     * Show custom alert with Bootstrap classes (for inline alerts)
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     * @param {HTMLElement} container - Container element to append alert
     * @param {number} duration - Auto-remove duration in ms (0 = no auto-remove)
     */
    static showBootstrapAlert(message, type = 'info', container = document.body, duration = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        container.insertBefore(alertDiv, container.firstChild);

        if (duration > 0) {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }, duration);
        }

        return alertDiv;
    }

    /**
     * Show toast notification (if SweetAlert2 is available, use it; otherwise use Bootstrap toast)
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Display duration in ms
     */
    static toast(message, type = 'info', duration = 3000) {
        if (typeof Swal !== 'undefined') {
            const iconMap = {
                success: 'success',
                error: 'error',
                warning: 'warning',
                info: 'info'
            };
            Swal.fire({
                icon: iconMap[type] || 'info',
                title: message,
                timer: duration,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            // Fallback to Bootstrap toast
            this.showBootstrapAlert(message, type, document.body, duration);
        }
    }

    /**
     * Aliases for toast notifications
     */
    static success(message, duration = 3000) { this.toast(message, 'success', duration); }
    static error(message, duration = 3000) { this.toast(message, 'error', duration); }
    static warning(message, duration = 3000) { this.toast(message, 'warning', duration); }
    static info(message, duration = 3000) { this.toast(message, 'info', duration); }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertManager;
}

