/**
 * SearchManager - Manages search/filter functionality for tables and lists
 * Provides debounced search with configurable behavior
 * Related to: productos.js, clientes.js, ventas.js
 */

class SearchManager {
    /**
     * Create a new SearchManager instance
     * @param {HTMLElement} inputElement - Search input element
     * @param {Function} searchCallback - Callback function to execute on search
     * @param {Object} options - Configuration options
     */
    constructor(inputElement, searchCallback, options = {}) {
        this.inputElement = inputElement;
        this.searchCallback = searchCallback;
        this.options = {
            debounceMs: options.debounceMs || 300,
            minLength: options.minLength || 0,
            caseSensitive: options.caseSensitive || false,
            ...options
        };
        this.timeoutId = null;
        this.init();
    }

    /**
     * Initialize search manager
     */
    init() {
        this.inputElement.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
    }

    /**
     * Handle input with debounce
     * @param {string} value - Input value
     */
    handleInput(value) {
        clearTimeout(this.timeoutId);

        if (value.length < this.options.minLength) {
            if (this.options.onClear) {
                this.options.onClear();
            }
            return;
        }

        this.timeoutId = setTimeout(() => {
            const searchTerm = this.options.caseSensitive 
                ? value 
                : value.toLowerCase();
            this.searchCallback(searchTerm);
        }, this.options.debounceMs);
    }

    /**
     * Filter table rows based on search term
     * @param {HTMLElement} tableBody - Table body element
     * @param {Function} matchFunction - Function to determine if row matches
     * @param {string} searchTerm - Search term
     */
    static filterTableRows(tableBody, matchFunction, searchTerm) {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const matches = matchFunction(row, searchTerm);
            row.style.display = matches ? '' : 'none';
        });
    }

    /**
     * Clear search
     */
    clear() {
        clearTimeout(this.timeoutId);
        this.inputElement.value = '';
        if (this.options.onClear) {
            this.options.onClear();
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}

