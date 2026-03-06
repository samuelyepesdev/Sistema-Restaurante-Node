/**
 * Utils - Utility functions for common operations
 * Provides formatting, validation, and helper functions
 * Related to: All JavaScript files
 */

class Utils {
    /**
     * Format number as currency
     * @param {number} value - Numeric value
     * @param {string} locale - Locale string (default: 'es-CO')
     * @returns {string} Formatted currency string
     */
    static formatCurrency(value, locale = 'es-CO') {
        return `$${Number(value || 0).toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    /**
     * Format number with locale
     * @param {number} value - Numeric value
     * @param {number} decimals - Number of decimals
     * @param {string} locale - Locale string
     * @returns {string} Formatted number
     */
    static formatNumber(value, decimals = 2, locale = 'es-CO') {
        return Number(value || 0).toLocaleString(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Reload page after delay
     * @param {number} delay - Delay in milliseconds (default: 0)
     */
    static reload(delay = 0) {
        if (delay > 0) {
            setTimeout(() => window.location.reload(), delay);
        } else {
            window.location.reload();
        }
    }

    /**
     * Get form data as object
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Form data
     */
    static getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    }

    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {boolean} True if valid
     */
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validate required fields
     * @param {Object} data - Data object
     * @param {Array<string>} requiredFields - Array of required field names
     * @returns {Object} Validation result { valid: boolean, missing: Array<string> }
     */
    static validateRequired(data, requiredFields) {
        const missing = requiredFields.filter(field => !data[field] || data[field].toString().trim() === '');
        return {
            valid: missing.length === 0,
            missing
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

