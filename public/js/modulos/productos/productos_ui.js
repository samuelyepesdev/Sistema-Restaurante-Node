// Initializers, events, and shortcuts for ProductManager module

ProductManager.prototype.init = function() {
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
      () => this.applyFilters(),
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
      const esModoEdicion = this.formManager.isEditMode;
      if (!e.relatedTarget && !esModoEdicion) {
        this.formManager.resetForm();
        document.getElementById('productoParametrosContainer')?.classList.add('d-none');
        setTimeout(() => {
          document.getElementById('codigo')?.focus();
        }, 500);
      }
      if (esModoEdicion) {
        document.getElementById('productoParametrosContainer')?.classList.remove('d-none');
      }
    });
  }

  // Costeo modal: aplicar precio sugerido
  const btnAplicar = document.getElementById('btnAplicarPrecioSugerido');
  if (btnAplicar) {
    btnAplicar.addEventListener('click', () => this.aplicarPrecioSugerido());
  }

  // Favoritos: toggle
  $(document).on('click', '.btn-toggle-favorito', (e) => {
    const btn = $(e.currentTarget);
    const id = btn.data('id');
    const esFav = btn.data('favorito');
    this.toggleFavorite(id, !esFav, btn);
  });
};

ProductManager.prototype.setupKeyboardShortcuts = function() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
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
};

ProductManager.prototype.setupImportExport = function() {
  const btnDescargarPlantilla = document.getElementById('btnDescargarPlantilla');
  if (btnDescargarPlantilla) {
    btnDescargarPlantilla.addEventListener('click', () => {
      window.open('/api/productos/plantilla', '_blank');
    });
  }

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

        let html = `<div class="text-start small">
          <div class="mb-1"><i class="bi bi-plus-circle text-success me-2"></i>Nuevos: <strong>${data.inserted}</strong></div>
          <div class="mb-1"><i class="bi bi-arrow-repeat text-primary me-2"></i>Actualizados: <strong>${data.updated}</strong></div>
        </div>`;

        if (data.errores && data.errores.length > 0) {
          html += `<hr><div class="text-start small text-danger">
            <strong><i class="bi bi-exclamation-triangle me-1"></i> Errores (${data.errores.length}):</strong>
            <div class="mt-2 p-2 bg-light border rounded" style="max-height: 100px; overflow-y: auto; font-size: 0.75rem;">
              ${data.errores.map(e => `• Fila ${e.fila}: ${e.mensaje}`).join('<br>')}
            </div>
          </div>`;
        }

        await Swal.fire({
          icon: data.errores?.length > 0 ? (data.inserted + data.updated > 0 ? 'warning' : 'error') : 'success',
          title: 'Importación Finalizada',
          html: html,
          confirmButtonText: 'Entendido'
        });
        
        if (data.inserted > 0 || data.updated > 0) {
          Utils.reload();
        }
      } catch (error) {
        AlertManager.alert(error.message, 'error');
      } finally {
        btnImportar.disabled = false;
        btnImportar.innerHTML = '<i class="bi bi-upload"></i> Importar Excel';
        e.target.value = '';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.productManager = new ProductManager();
});

window.editarProducto = function(id) {
  if (window.productManager) {
    window.productManager.editProduct(id);
  }
};

window.eliminarProducto = function(id) {
  if (window.productManager) {
    window.productManager.deleteProduct(id);
  }
};
