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
            resetFields: ['productoId'],
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
                (searchTerm) => this.handleSearch(searchTerm),
                {
                    debounceMs: 300,
                    minLength: 0,
                    onClear: () => this.clearSearch()
                }
            );
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
            precio_kg: parseFloat(data.precioKg || document.getElementById('precioKg').value) || 0,
            precio_unidad: parseFloat(data.precioUnidad || document.getElementById('precioUnidad').value) || 0,
            precio_libra: parseFloat(data.precioLibra || document.getElementById('precioLibra').value) || 0
        };

        try {
            if (isEdit) {
                await ApiClient.put(`/productos/${id}`, productData);
            } else {
                await ApiClient.post('/productos', productData);
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
            const producto = await ApiClient.get(`/productos/${id}`);
            document.getElementById('productoId').value = producto.id;
            document.getElementById('codigo').value = producto.codigo;
            document.getElementById('nombre').value = producto.nombre;
            document.getElementById('precioKg').value = producto.precio_kg;
            document.getElementById('precioUnidad').value = producto.precio_unidad;
            document.getElementById('precioLibra').value = producto.precio_libra;
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
            await ApiClient.delete(`/productos/${id}`);
            Utils.reload();
        } catch (error) {
            AlertManager.alert(error.message, 'error');
        }
    }

    /**
     * Handle search
     */
    handleSearch(searchTerm) {
        if (!this.tableManager) return;

        this.tableManager.filterRows((row) => {
            const codigo = row.cells[0]?.textContent.toLowerCase() || '';
            const nombre = row.cells[1]?.textContent.toLowerCase() || '';
            return codigo.includes(searchTerm) || nombre.includes(searchTerm);
        });
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (this.tableManager) {
            this.tableManager.clearFilters();
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

