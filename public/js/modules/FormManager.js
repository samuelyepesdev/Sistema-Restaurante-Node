/**
 * FormManager - Manages modal forms for create/edit operations
 * Handles form validation, submission, and modal state
 * Related to: productos.js, clientes.js
 */

class FormManager {
    /**
     * Create a new FormManager instance
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        this.config = {
            modalId: config.modalId,
            formId: config.formId,
            submitButtonId: config.submitButtonId,
            titleElementId: config.titleElementId,
            createTitle: config.createTitle || 'Nuevo',
            editTitle: config.editTitle || 'Editar',
            onSubmit: config.onSubmit,
            onEdit: config.onEdit,
            resetFields: config.resetFields || [],
            ...config
        };

        this.modal = null;
        this.form = null;
        this.isEditMode = false;
        this.currentId = null;

        this.init();
    }

    /**
     * Initialize form manager
     */
    init() {
        const modalElement = document.getElementById(this.config.modalId);
        if (!modalElement) {
            console.error(`Modal element not found: ${this.config.modalId}`);
            return;
        }

        this.modal = new bootstrap.Modal(modalElement);
        this.form = document.getElementById(this.config.formId);

        if (!this.form) {
            console.error(`Form element not found: ${this.config.formId}`);
            return;
        }

        // Submit button handler
        const submitButton = document.getElementById(this.config.submitButtonId);
        if (submitButton) {
            submitButton.addEventListener('click', () => this.handleSubmit());
        }

        // Modal events
        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!this.isEditMode) {
                this.resetForm();
            }
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            this.isEditMode = false;
            this.currentId = null;
        });
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        this.form.reset();
        this.isEditMode = false;
        this.currentId = null;

        if (this.config.titleElementId) {
            const titleElement = document.getElementById(this.config.titleElementId);
            if (titleElement) {
                titleElement.textContent = this.config.createTitle;
            }
        }

        // Reset specific fields
        this.config.resetFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
    }

    /**
     * Show modal for creating new item
     */
    showCreate() {
        this.resetForm();
        this.modal.show();
    }

    /**
     * Show modal for editing item
     * @param {string|number} id - Item ID
     */
    async showEdit(id) {
        this.isEditMode = true;
        this.currentId = id;

        if (this.config.titleElementId) {
            const titleElement = document.getElementById(this.config.titleElementId);
            if (titleElement) {
                titleElement.textContent = this.config.editTitle;
            }
        }

        if (this.config.onEdit) {
            await this.config.onEdit(id, this);
        }

        this.modal.show();
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        const submitButton = document.getElementById(this.config.submitButtonId);
        const originalHtml = submitButton ? submitButton.innerHTML : null;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1" style="width:.85em;height:.85em;border-width:2px;" role="status"></span>Guardando...';
        }

        try {
            if (this.config.onSubmit) {
                await this.config.onSubmit(this.getFormData(), this.isEditMode, this.currentId, this);
            }
        } finally {
            if (submitButton && document.body.contains(submitButton)) {
                submitButton.disabled = false;
                if (originalHtml !== null) submitButton.innerHTML = originalHtml;
            }
        }
    }

    /**
     * Get form data as object
     * @returns {Object} Form data
     */
    getFormData() {
        const formData = new FormData(this.form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    }

    /**
     * Set form data
     * @param {Object} data - Data to set
     */
    setFormData(data) {
        Object.keys(data).forEach(key => {
            const field = this.form.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                field.value = data[key] || '';
            }
        });
    }

    /**
     * Hide modal
     */
    hide() {
        this.modal.hide();
    }

    /**
     * Show modal
     */
    show() {
        this.modal.show();
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormManager;
}

