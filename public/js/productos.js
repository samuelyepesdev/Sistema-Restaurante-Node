/**
 * Productos Manager - Refactored using modular architecture
 * Manages product CRUD operations
 * Related to: views/productos.ejs, routes/productos.js, modules/ApiClient.js, modules/FormManager.js, etc.
 */

// Product manager class
class ProductManager {
    constructor() {
        this.formManager = null;
        this.tableManager = null;
        this.searchManager = null;
        this.init();
    }

    /**
     * Initialize product manager
     */
    init() {
        // Initialize form manager
        this.formManager = new FormManager({
            modalId: 'nuevoProductoModal',
            formId: 'formProducto',
            submitButtonId: 'guardarProducto',
            titleElementId: 'modalTitle',
            createTitle: 'Nuevo Producto',
            editTitle: 'Editar Producto',
            resetFields: ['productoId', 'categoriaId'],
            onSubmit: (data, isEdit, id) => this.handleSubmit(data, isEdit, id),
            onEdit: (id) => this.handleEdit(id)
        });

        // Initialize table manager
        this.tableManager = new TableManager({
            tableBodyId: 'productosTabla',
            onEdit: (id) => this.editProduct(id),
            onDelete: (id) => this.deleteProduct(id),
            onCosteo: (id) => this.showCosteoModal(id),
            deleteConfirmMessage: '¿Está seguro de eliminar este producto?'
        });

        // Initialize search manager
        const searchInput = document.getElementById('buscarProducto');
        if (searchInput) {
            this.searchManager = new SearchManager(
                searchInput,
                (searchTerm) => this.applyFilters(),
                {
                    debounceMs: 300,
                    minLength: 0,
                    onClear: () => this.applyFilters()
                }
            );
        }

        // Setup category filter
        const categoriaFilter = document.getElementById('filtroCategoria');
        if (categoriaFilter) {
            categoriaFilter.addEventListener('change', () => this.applyFilters());
        }

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup import/export buttons
        this.setupImportExport();

        // Setup modal event for new product
        const modal = document.getElementById('nuevoProductoModal');
        if (modal) {
            modal.addEventListener('show.bs.modal', (e) => {
                if (!e.relatedTarget) {
                    this.formManager.resetForm();
                    document.getElementById('productoParametrosContainer')?.classList.add('d-none');
                    setTimeout(() => {
                        document.getElementById('codigo')?.focus();
                    }, 500);
                }
            });
        }

        // Costeo modal: aplicar precio sugerido
        const btnAplicar = document.getElementById('btnAplicarPrecioSugerido');
        if (btnAplicar) {
            btnAplicar.addEventListener('click', () => this.aplicarPrecioSugerido());
        }
    }

    /**
     * Show costeo modal for a product (must have linked recipe)
     */
    async showCosteoModal(productoId) {
        const modalEl = document.getElementById('costeoProductoModal');
        const loadingEl = document.getElementById('costeoLoading');
        const contentEl = document.getElementById('costeoContent');
        const errorEl = document.getElementById('costeoError');
        const footerEl = document.getElementById('costeoFooter');
        if (!modalEl || !loadingEl || !contentEl) return;

        loadingEl.classList.remove('d-none');
        contentEl.classList.add('d-none');
        errorEl.classList.add('d-none');
        footerEl.classList.add('d-none');
        errorEl.textContent = '';
        this._costeoProductoId = productoId;
        this._costeoData = null;

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        try {
            const data = await fetch(`/costeo/api/costeo/producto/${productoId}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            }).then(res => {
                if (!res.ok) return res.json().then(j => Promise.reject(new Error(j.error || res.statusText)));
                return res.json();
            });
            this._costeoData = data;
            const fmt = (n) => n != null && !isNaN(n) ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '-';
            document.getElementById('costeoDirecto').textContent = '$' + fmt(data.costo_directo_porcion);
            document.getElementById('costeoIndirecto').textContent = '$' + fmt(data.costo_indirecto);
            document.getElementById('costeoTotal').textContent = '$' + fmt(data.costo_total_porcion);
            document.getElementById('costeoPrecioSug').textContent = '$' + fmt(data.precio_sugerido);
            document.getElementById('costeoPrecioActual').textContent = '$' + fmt(data.precio_venta_actual);
            document.getElementById('costeoMargen').textContent = data.margen_actual_pct != null ? data.margen_actual_pct + '%' : '-';
            loadingEl.classList.add('d-none');
            contentEl.classList.remove('d-none');
            footerEl.classList.remove('d-none');
        } catch (err) {
            loadingEl.classList.add('d-none');
            errorEl.textContent = err.message || 'No se pudo cargar el costeo.';
            errorEl.classList.remove('d-none');
            footerEl.classList.remove('d-none');
        }
    }

    /**
     * Apply suggested price from costeo to product
     */
    async aplicarPrecioSugerido() {
        const id = this._costeoProductoId;
        const data = this._costeoData;
        if (!id || !data || data.precio_sugerido == null) return;
        try {
            await ApiClient.put(`/api/productos/${id}/precio`, { precio_unidad: data.precio_sugerido });
            bootstrap.Modal.getInstance(document.getElementById('costeoProductoModal'))?.hide();
            Utils.reload();
        } catch (error) {
            AlertManager.alert(error.message || 'Error al actualizar precio', 'error');
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(data, isEdit, id) {
        const productData = {
            codigo: data.codigo || document.getElementById('codigo').value,
            nombre: data.nombre || document.getElementById('nombre').value,
            categoria_id: data.categoriaId || document.getElementById('categoriaId').value,
            precio_unidad: parseFloat(data.precioUnidad || document.getElementById('precioUnidad').value) || 0
        };

        try {
            if (isEdit) {
                await ApiClient.put(`/api/productos/${id}`, productData);
                const checkboxes = document.querySelectorAll('#productoParametrosCheckboxes .producto-parametro-cb:checked');
                const parametroIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
                await fetch('/costeo/api/productos/' + id + '/parametros', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ parametro_ids: parametroIds })
                }).then(r => { if (!r.ok) throw new Error('Error al guardar parámetros'); });
            } else {
                await ApiClient.post('/api/productos', productData);
            }
            
            Utils.reload();
        } catch (error) {
            AlertManager.alert(error.message, 'error');
        }
    }

    /**
     * Handle edit - load product data and parametros for costeo filter
     */
    async handleEdit(id) {
        try {
            const producto = await ApiClient.get(`/api/productos/${id}`);
            document.getElementById('productoId').value = producto.id;
            document.getElementById('codigo').value = producto.codigo;
            document.getElementById('nombre').value = producto.nombre;
            document.getElementById('categoriaId').value = producto.categoria_id || '';
            document.getElementById('precioUnidad').value = producto.precio_unidad;
            const paramContainer = document.getElementById('productoParametrosContainer');
            if (paramContainer) {
                paramContainer.classList.remove('d-none');
                const [allParams, productParams] = await Promise.all([
                    fetch('/costeo/api/parametros', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : []),
                    fetch('/costeo/api/productos/' + id + '/parametros', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : [])
                ]).catch(() => [[], []]);
                const assignedIds = new Set((productParams || []).map(p => p.id));
                const div = document.getElementById('productoParametrosCheckboxes');
                div.innerHTML = '';
                (allParams || []).forEach(p => {
                    const label = document.createElement('label');
                    label.className = 'd-block me-3';
                    label.innerHTML = `<input type="checkbox" class="form-check-input me-2 producto-parametro-cb" value="${p.id}" ${assignedIds.has(p.id) ? 'checked' : ''}> ${p.name}`;
                    div.appendChild(label);
                });
            }
        } catch (error) {
            AlertManager.alert('Error al cargar el producto', 'error');
        }
    }

    /**
     * Edit product
     */
    editProduct(id) {
        this.formManager.showEdit(id);
    }

    /**
     * Delete product
     */
    async deleteProduct(id) {
        const confirmed = await AlertManager.confirm('¿Está seguro de eliminar este producto?');
        if (!confirmed) return;

        try {
            await ApiClient.delete(`/api/productos/${id}`);
            Utils.reload();
        } catch (error) {
            AlertManager.alert(error.message, 'error');
        }
    }

    /**
     * Handle search - now combined with category filter
     */
    handleSearch(searchTerm) {
        this.applyFilters();
    }

    /**
     * Apply filters (search text + category)
     */
    applyFilters() {
        if (!this.tableManager) return;

        const searchTerm = (document.getElementById('buscarProducto')?.value || '').toLowerCase();
        const categoriaId = document.getElementById('filtroCategoria')?.value || '';

        this.tableManager.filterRows((row) => {
            // Filter by category
            if (categoriaId) {
                const rowCategoriaId = row.getAttribute('data-categoria-id') || '';
                if (rowCategoriaId !== categoriaId) {
                    return false;
                }
            }

            // Filter by search term
            if (searchTerm) {
                const codigo = row.cells[0]?.textContent.toLowerCase() || '';
                const nombre = row.cells[1]?.textContent.toLowerCase() || '';
                const categoria = row.cells[2]?.textContent.toLowerCase() || '';
                if (!codigo.includes(searchTerm) && !nombre.includes(searchTerm) && !categoria.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (this.tableManager) {
            this.tableManager.clearFilters();
        }
        if (document.getElementById('filtroCategoria')) {
            document.getElementById('filtroCategoria').value = '';
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        document.getElementById('buscarProducto')?.focus();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.formManager.showCreate();
                        document.getElementById('codigo')?.focus();
                        break;
                }
            } else if (e.key === '/') {
                e.preventDefault();
                document.getElementById('buscarProducto')?.focus();
            }
        });
    }

    /**
     * Setup import/export functionality
     */
    setupImportExport() {
        // Download template
        const btnDescargarPlantilla = document.getElementById('btnDescargarPlantilla');
        if (btnDescargarPlantilla) {
            btnDescargarPlantilla.addEventListener('click', () => {
                window.open('/api/productos/plantilla', '_blank');
            });
        }

        // Import products
        const btnImportar = document.getElementById('btnImportarProductos');
        const inputImport = document.getElementById('archivoImport');
        
        if (btnImportar && inputImport) {
            btnImportar.addEventListener('click', () => inputImport.click());
            
            inputImport.addEventListener('change', async (e) => {
                if (!e.target.files.length) return;
                
                const formData = new FormData();
                formData.append('archivo', e.target.files[0]);
                
                btnImportar.disabled = true;
                btnImportar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Importando...';
                
                try {
                    const response = await fetch('/api/productos/importar', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Error al importar');
                    }
                    
                    alert(`Importación completa: ${data.inserted} filas.`);
                    Utils.reload();
                } catch (error) {
                    AlertManager.alert(error.message, 'error');
                } finally {
                    btnImportar.disabled = false;
                    btnImportar.innerHTML = '<i class="bi bi-upload"></i> Importar Excel';
                    e.target.value = '';
                }
            });
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.productManager = new ProductManager();
});

// Export functions for backward compatibility
function editarProducto(id) {
    if (window.productManager) {
        window.productManager.editProduct(id);
    }
}

function eliminarProducto(id) {
    if (window.productManager) {
        window.productManager.deleteProduct(id);
    }
}

