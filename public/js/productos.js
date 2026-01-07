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
                    setTimeout(() => {
                        document.getElementById('codigo')?.focus();
                    }, 500);
                }
            });
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
            } else {
                await ApiClient.post('/api/productos', productData);
            }
            
            Utils.reload();
        } catch (error) {
            AlertManager.alert(error.message, 'error');
        }
    }

    /**
     * Handle edit - load product data
     */
    async handleEdit(id) {
        try {
            const producto = await ApiClient.get(`/api/productos/${id}`);
            document.getElementById('productoId').value = producto.id;
            document.getElementById('codigo').value = producto.codigo;
            document.getElementById('nombre').value = producto.nombre;
            document.getElementById('categoriaId').value = producto.categoria_id || '';
            document.getElementById('precioUnidad').value = producto.precio_unidad;
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

