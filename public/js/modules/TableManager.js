/**
 * TableManager - Manages table operations (CRUD actions, filtering, etc.)
 * Provides reusable table functionality
 * Related to: productos.js, clientes.js, ventas.js
 */

class TableManager {
    /**
     * Create a new TableManager instance
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        this.config = {
            tableBodyId: config.tableBodyId,
            onEdit: config.onEdit,
            onDelete: config.onDelete,
            onCosteo: config.onCosteo,
            deleteConfirmMessage: config.deleteConfirmMessage || '¿Está seguro de que desea eliminar este elemento?',
            ...config
        };

        this.tableBody = document.getElementById(this.config.tableBodyId);
        if (!this.tableBody) {
            console.error(`Table body not found: ${this.config.tableBodyId}`);
        }

        this.init();
    }

    /**
     * Initialize table manager
     */
    init() {
        if (!this.tableBody) return;

        // Delegate edit/delete actions
        this.tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.getAttribute('data-action');
            const id = button.getAttribute('data-id') || 
                      button.getAttribute('data-cliente-id') || 
                      button.getAttribute('data-producto-id');

            if (!id) return;

            if (action === 'editar' && this.config.onEdit) {
                this.config.onEdit(id);
            } else if (action === 'eliminar' && this.config.onDelete) {
                this.config.onDelete(id);
            } else if (action === 'costeo' && this.config.onCosteo) {
                this.config.onCosteo(id);
            }
        });
    }

    /**
     * Filter table rows
     * @param {Function} matchFunction - Function that returns true if row matches
     */
    filterRows(matchFunction) {
        if (!this.tableBody) return;
        
        const rows = this.tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const matches = matchFunction(row);
            row.style.display = matches ? '' : 'none';
        });
    }

    /**
     * Clear all filters (show all rows)
     */
    clearFilters() {
        if (!this.tableBody) return;
        
        const rows = this.tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.display = '';
        });
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableManager;
}

