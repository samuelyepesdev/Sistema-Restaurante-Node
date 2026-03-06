/**
 * ApiClient - Centralized API client for making HTTP requests
 * Handles authentication, errors, and response formatting
 * Related to: All API routes, auth-helper.js
 */

class ApiClient {
    /**
     * Get authentication token from localStorage
     * @returns {string} JWT token
     */
    static getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    /**
     * Get default headers with authentication
     * @returns {Object} Headers object
     */
    static getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Make a GET request
     * @param {string} url - API endpoint
     * @returns {Promise<Object>} Response data
     */
    static async get(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    /**
     * Make a POST request
     * @param {string} url - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    static async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }

    /**
     * Make a PUT request
     * @param {string} url - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    static async put(url, data) {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    }

    /**
     * Make a DELETE request
     * @param {string} url - API endpoint
     * @returns {Promise<Object>} Response data
     */
    static async delete(url) {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json().catch(() => ({}));
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }
}

// Export for use in modules (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}

