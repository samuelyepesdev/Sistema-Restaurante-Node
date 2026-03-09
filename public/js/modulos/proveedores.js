document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('proveedorForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('p_id').value;
        const data = {
            nombre: document.getElementById('p_nombre').value,
            nit: document.getElementById('p_nit').value,
            contacto: document.getElementById('p_contacto').value,
            telefono: document.getElementById('p_telefono').value,
            email: document.getElementById('p_email').value,
            direccion: document.getElementById('p_direccion').value,
            activo: document.getElementById('p_activo').value
        };

        try {
            const url = id ? `/proveedores/${id}` : '/proveedores';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: id ? 'Actualizado' : 'Creado',
                    text: 'El proveedor ha sido guardado correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => location.reload());
            } else {
                const err = await response.json();
                Swal.fire('Error', err.error || 'No se pudo guardar', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    });

    // Delegación de eventos para la tabla y tarjetas móvil
    const container = document.getElementById('proveedoresContainer');
    if (container) {
        container.addEventListener('click', (e) => {
            const btnFacturas = e.target.closest('.btn-facturas');
            const btnEditar = e.target.closest('.btn-editar');
            const btnEliminar = e.target.closest('.btn-eliminar');

            if (btnFacturas) {
                const id = btnFacturas.dataset.id;
                const nombre = btnFacturas.dataset.nombre;
                abrirFacturas(id, nombre);
            } else if (btnEditar) {
                const id = btnEditar.dataset.id;
                editProveedor(id);
            } else if (btnEliminar) {
                const id = btnEliminar.dataset.id;
                deleteProveedor(id);
            }
        });
    }
});

function resetForm() {
    document.getElementById('modalTitle').innerText = 'Nuevo Proveedor';
    document.getElementById('p_id').value = '';
    document.getElementById('proveedorForm').reset();
    document.getElementById('p_activo').value = '1';
}

async function editProveedor(id) {
    try {
        const res = await fetch(`/proveedores/${id}`);
        const p = await res.json();

        document.getElementById('modalTitle').innerText = 'Editar Proveedor';
        document.getElementById('p_id').value = p.id;
        document.getElementById('p_nombre').value = p.nombre;
        document.getElementById('p_nit').value = p.nit || '';
        document.getElementById('p_contacto').value = p.contacto || '';
        document.getElementById('p_telefono').value = p.telefono || '';
        document.getElementById('p_email').value = p.email || '';
        document.getElementById('p_direccion').value = p.direccion || '';
        document.getElementById('p_activo').value = p.activo ? '1' : '0';

        const modal = new bootstrap.Modal(document.getElementById('proveedorModal'));
        modal.show();
    } catch (error) {
        Swal.fire('Error', 'No se pudo cargar el proveedor', 'error');
    }
}

async function deleteProveedor(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/proveedores/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Eliminado', 'Proveedor eliminado correctamente.', 'success')
                    .then(() => location.reload());
            } else {
                const err = await res.json();
                Swal.fire('Error', err.error || 'No se pudo eliminar', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    }
}

// --- GESTIÓN DE FACTURAS ---

const modalFacturas = new bootstrap.Modal(document.getElementById('modalFacturasProveedor'));

async function abrirFacturas(id, nombre) {
    document.getElementById('facturaProveedorId').value = id;
    document.getElementById('facturaProveedorNombre').innerText = nombre;
    await cargarFacturas(id);
    modalFacturas.show();
}

async function cargarFacturas(proveedorId) {
    const tbody = document.getElementById('listaFacturasCuerpo');
    const msgVacio = document.getElementById('sinFacturasMsg');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando...</td></tr>';

    try {
        const res = await fetch(`/proveedores/${proveedorId}/facturas`);
        const facturas = await res.json();

        tbody.innerHTML = '';
        if (!facturas || facturas.length === 0) {
            msgVacio.classList.remove('d-none');
            return;
        }

        msgVacio.classList.add('d-none');
        facturas.forEach(f => {
            const fecha = f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString() : 'N/A';
            const monto = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(f.monto_total);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="small">${fecha}</td>
                <td class="fw-bold">${f.numero_factura || '-'}</td>
                <td class="text-end fw-bold text-dark">${monto}</td>
                <td class="text-center">
                    <a href="/proveedores/facturas/${f.id}/ver" target="_blank" class="btn btn-sm btn-light border" title="Ver archivo">
                        <i class="bi bi-file-earmark-pdf text-danger"></i>
                    </a>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarFactura(${f.id}, ${proveedorId})" title="Eliminar">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar facturas</td></tr>';
    }
}

document.getElementById('formCargarFactura').addEventListener('submit', async function (e) {
    e.preventDefault();
    const proveedorId = document.getElementById('facturaProveedorId').value;
    const formData = new FormData(this);
    const btn = this.querySelector('button[type="submit"]');
    const originalHtml = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo...';

    try {
        const res = await fetch(`/proveedores/${proveedorId}/facturas`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: data.message, timer: 1500, showConfirmButton: false });
            this.reset();
            await cargarFacturas(proveedorId);
        } else {
            Swal.fire('Error', data.error || 'No se pudo subir el archivo', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Error de red o archivo demasiado grande', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
});

async function eliminarFactura(facturaId, proveedorId) {
    const result = await Swal.fire({
        title: '¿Eliminar factura?',
        text: "Se borrará el archivo de la base de datos.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/proveedores/facturas/${facturaId}`, { method: 'DELETE' });
            if (res.ok) {
                await cargarFacturas(proveedorId);
                Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1000, showConfirmButton: false });
            } else {
                throw new Error('No se pudo eliminar');
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}
