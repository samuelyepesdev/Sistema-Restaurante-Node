// Variables globales
let clienteModal;
let modoEdicion = false;

$(document).ready(function() {
    clienteModal = new bootstrap.Modal(document.getElementById('clienteModal'));

    // Búsqueda de clientes
    $('#buscarCliente').on('keyup', function() {
        let valor = $(this).val().toLowerCase();
        $("#clientesTabla tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(valor) > -1);
        });
    });

    // Manejar clics en los botones de acción
    $(document).on('click', '[data-action]', function() {
        const id = $(this).data('cliente-id');
        const action = $(this).data('action');

        if (action === 'editar') {
            editarCliente(id);
        } else if (action === 'eliminar') {
            eliminarCliente(id);
        }
    });

    // Limpiar modal al abrirlo para nuevo cliente
    $('#clienteModal').on('show.bs.modal', function(e) {
        if (!modoEdicion) {
            $('#formCliente').trigger('reset');
            $('#clienteId').val('');
            $('#modalTitle').text('Nuevo Cliente');
        }
    });

    // Limpiar modo edición al cerrar el modal
    $('#clienteModal').on('hidden.bs.modal', function () {
        modoEdicion = false;
    });

    // Guardar cliente
    $('#guardarCliente').click(function() {
        const cliente = {
            nombre: $('#nombre').val(),
            direccion: $('#direccion').val(),
            telefono: $('#telefono').val()
        };

        if (!cliente.nombre) {
            alert('El nombre es requerido');
            return;
        }

        const url = modoEdicion ? `/api/clientes/${$('#clienteId').val()}` : '/api/clientes';
        const method = modoEdicion ? 'PUT' : 'POST';

        $.ajax({
            url: url,
            method: method,
            data: cliente,
            success: function() {
                clienteModal.hide();
                location.reload();
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.error || 'Error al guardar el cliente');
            }
        });
    });
});

// Editar cliente
function editarCliente(id) {
    $.get(`/api/clientes/${id}`, function(cliente) {
        modoEdicion = true;
        $('#clienteId').val(cliente.id);
        $('#nombre').val(cliente.nombre);
        $('#direccion').val(cliente.direccion || '');
        $('#telefono').val(cliente.telefono || '');
        $('#modalTitle').text('Editar Cliente');
        clienteModal.show();
    });
}

// Eliminar cliente
function eliminarCliente(id) {
    if (confirm('¿Está seguro de que desea eliminar este cliente?')) {
        $.ajax({
            url: `/api/clientes/${id}`,
            method: 'DELETE',
            success: function() {
                location.reload();
            },
            error: function(xhr) {
                const mensaje = xhr.responseJSON?.error || 'Error al eliminar el cliente';
                alert(mensaje);
            }
        });
    }
} 