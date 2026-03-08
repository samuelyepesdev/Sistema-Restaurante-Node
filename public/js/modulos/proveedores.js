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
