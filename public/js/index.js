$(document).ready(function() {
    // Configuración global de SweetAlert2
    const swalBootstrap = Swal.mixin({
        customClass: {
            container: 'my-swal',
            popup: 'shadow-sm border-0 rounded-4',
            header: 'border-bottom-0',
            title: 'fs-5 fw-semibold',
            htmlContainer: 'text-body-secondary',
            confirmButton: 'btn btn-primary px-4 py-2',
            cancelButton: 'btn btn-outline-secondary px-4 py-2 ms-2'
        },
        buttonsStyling: false,
        padding: '1.5rem',
        background: '#fff',
        backdrop: 'rgba(0,0,0,0.5)',
        showClass: {
            popup: 'animate__animated animate__fadeIn animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOut animate__faster'
        }
    });

    // Reemplazar todas las instancias de Swal.fire con swalBootstrap.fire
    const originalSwalFire = Swal.fire;
    Swal.fire = function(...args) {
        const options = args[0];
        const defaultOptions = {
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d'
        };
        return originalSwalFire({ ...defaultOptions, ...options });
    };

    // Inicialización de variables globales
    let pedidosGuardados = JSON.parse(localStorage.getItem('pedidos') || '[]');
    let productosFactura = [];
    let totalFactura = 0;

    // Función para actualizar localStorage
    function actualizarLocalStorage() {
        localStorage.setItem('pedidos', JSON.stringify(pedidosGuardados));
    }

    // Inicializar Select2 para búsqueda de clientes y productos con mejoras
    $('.select2').select2({
        width: '100%',
        language: {
            noResults: function() {
                return "No se encontraron resultados";
            },
            searching: function() {
                return "Buscando...";
            },
            inputTooShort: function() {
                return "Por favor ingrese más caracteres...";
            }
        },
        ajax: {
            url: function() {
                if ($(this).attr('id') === 'cliente') {
                    return '/clientes/buscar';
                } else {
                    return '/api/productos/buscar';
                }
            },
            dataType: 'json',
            delay: 250,
            data: function(params) {
                return {
                    q: params.term
                };
            },
            processResults: function(data) {
                return {
                    results: data.map(item => ({
                        id: item.id,
                        text: item.nombre,
                        ...item
                    }))
                };
            },
            cache: true
        },
        minimumInputLength: 1,
        templateResult: function(item) {
            if (!item.id) return item.text;
            
            if (item.codigo) { // Es un producto
                return $(`
                    <div>
                        <strong>${item.codigo}</strong> - ${item.nombre}
                        <div class="small text-muted">
                            KG: $${item.precio_kg} | UND: $${item.precio_unidad} | LB: $${item.precio_libra}
                        </div>
                    </div>
                `);
            } else { // Es un cliente
                return $(`
                    <div>
                        <strong>${item.nombre}</strong>
                        ${item.telefono ? `<div class="small text-muted">Tel: ${item.telefono}</div>` : ''}
                    </div>
                `);
            }
        }
    }).on('select2:open', function() {
        const searchField = $('.select2-search__field:visible').last();
        if (searchField.length) {
            searchField.focus();
        }
    });

    // Función mejorada para abrir y enfocar Select2
    function openAndFocusSelect2(selector) {
        $(selector).select2('open');
        
        // Intentamos múltiples veces para asegurar que el campo esté disponible
        const maxAttempts = 5;
        let attempts = 0;
        
        const tryFocus = () => {
            const searchField = $('.select2-container--open .select2-search__field').first();
            console.log('Intento de focus:', attempts + 1, 'Campo encontrado:', searchField.length > 0);
            
            if (searchField.length > 0) {
                searchField[0].focus();
                // Forzar el focus
                setTimeout(() => {
                    searchField[0].focus();
                    if (document.activeElement === searchField[0]) {
                        console.log('Focus exitoso');
                    }
                }, 50);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryFocus, 100);
            }
        };

        // Iniciamos el proceso de focus
        setTimeout(tryFocus, 100);
    }

    // Teclas rápidas
    $(document).on('keydown', function(e) {
        // No capturar atajos si el foco está en un campo editable
        const target = e.target;
        const isEditable = (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            (target.classList && target.classList.contains('swal2-input'))
        );
        if (isEditable) return; // permitir copiar/pegar y escribir con normalidad
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b': // Ctrl/Cmd + B para buscar producto
                    e.preventDefault();
                    openAndFocusSelect2('#producto');
                    break;
                case 'f': // Ctrl/Cmd + F para buscar cliente
                    e.preventDefault();
                    openAndFocusSelect2('#cliente');
                    break;
                case 'g': // Ctrl/Cmd + G para generar factura
                    e.preventDefault();
                    $('#generarFactura').click();
                    break;
                case 'n': // Ctrl/Cmd + N para nuevo cliente
                    e.preventDefault();
                    $('#nuevoClienteModal').modal('show');
                    setTimeout(() => {
                        $('#nombreCliente').focus();
                    }, 500);
                    break;
            }
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            switch(e.key) {
                case '/': // Tecla '/' para buscar producto
                    e.preventDefault();
                    openAndFocusSelect2('#producto');
                    break;
                case '.': // Tecla '.' para buscar cliente
                    e.preventDefault();
                    openAndFocusSelect2('#cliente');
                    break;
            }
        }
    });

    // Función helper para mostrar alertas
    function mostrarAlerta(tipo, mensaje) {
        swalBootstrap.fire({
            icon: tipo,
            title: mensaje
        });
    }

    // Función para alertas de confirmación
    function confirmarAccion(titulo, mensaje) {
        return swalBootstrap.fire({
            title: titulo,
            text: mensaje,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar'
        });
    }

    // Guardar nuevo cliente
    $('#guardarCliente').click(function() {
        const cliente = {
            nombre: $('#nombreCliente').val().trim(),
            direccion: $('#direccionNuevoCliente').val().trim(),
            telefono: $('#telefonoNuevoCliente').val().trim()
        };

        if (!cliente.nombre) {
            mostrarAlerta('error', 'El nombre es requerido');
            return;
        }

        $.ajax({
            url: '/api/clientes',
            method: 'POST',
            data: cliente,
            success: function(response) {
                // Crear nueva opción en el select
                const newOption = new Option(cliente.nombre, response.id, true, true);
                $('#cliente').append(newOption).trigger('change');
                
                // Actualizar información del cliente
                $('#direccionCliente').text(cliente.direccion || 'No especificada');
                $('#telefonoCliente').text(cliente.telefono || 'No especificado');
                $('#infoCliente').show();

                // Cerrar modal y limpiar formulario
                const modal = bootstrap.Modal.getInstance(document.getElementById('nuevoClienteModal'));
                if (modal) {
                    modal.hide();
                } else {
                    $('#nuevoClienteModal').modal('hide');
                }
                $('#formNuevoCliente')[0].reset();
                
                mostrarAlerta('success', 'Cliente guardado exitosamente');
            },
            error: function(xhr) {
                console.error('Error al guardar cliente:', xhr);
                const error = xhr.responseJSON?.error || 'Error al guardar el cliente';
                mostrarAlerta('error', error);
            }
        });
    });

    // Remover el evento submit del formulario para evitar conflictos
    $('#formNuevoCliente').on('submit', function(e) {
        e.preventDefault();
    });

    // Manejar la navegación con teclas
    $('#cantidad').on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#agregarProducto').click();
        }
    });

    // Agregar tooltips para mostrar las teclas rápidas
    const tooltips = [
        { 
            element: '#cliente + .select2',
            title: 'Teclas rápidas: Ctrl+F o .'
        },
        {
            element: '#producto + .select2',
            title: 'Teclas rápidas: Ctrl+B o /'
        },
        {
            element: '#agregarProducto',
            title: 'Tecla rápida: Ctrl+Enter'
        },
        {
            element: '#generarFactura',
            title: 'Tecla rápida: Ctrl+G'
        }
    ];

    tooltips.forEach(({element, title}) => {
        $(element).attr('title', title);
        new bootstrap.Tooltip($(element)[0]);
    });

    // Manejar cambio de cliente seleccionado
    $('#cliente').on('select2:select', function(e) {
        const cliente = e.params.data;
        $('#direccionCliente').text(cliente.direccion || 'No especificada');
        $('#telefonoCliente').text(cliente.telefono || 'No especificado');
        $('#infoCliente').show();
    });

    // Reemplazar el select2 con un input simple para búsqueda de productos
    const productoInput = $(`
        <input type="text" 
               id="buscarProductoInput" 
               class="form-control" 
               placeholder="Buscar producto... (Ctrl+B o /)"
               autocomplete="off">
    `).insertAfter('#producto');
    
    // Ocultar el select original
    $('#producto').hide();

    // Manejar la búsqueda de productos
    let timeoutId;
    productoInput.on('input', function() {
        clearTimeout(timeoutId);
        const query = $(this).val();
        
        timeoutId = setTimeout(() => {
            $.ajax({
                url: '/api/productos/buscar',
                data: { q: query },
                success: function(data) {
                    // Mostrar resultados en un dropdown debajo del input
                    mostrarResultadosProductos(data);
                }
            });
        }, 300);
    });

    // Función para mostrar resultados
    function mostrarResultadosProductos(productos) {
        let resultsDiv = $('#resultadosProductos');
        if (!resultsDiv.length) {
            resultsDiv = $('<div id="resultadosProductos" class="dropdown-menu w-100"></div>')
                .insertAfter(productoInput);
        }

        if (productos.length === 0) {
            resultsDiv.html('<div class="dropdown-item text-muted">No se encontraron productos</div>');
        } else {
            resultsDiv.empty();
            productos.forEach(producto => {
                $(`<a class="dropdown-item">
                    <strong>${producto.codigo}</strong> - ${producto.nombre}
                    <div class="small text-muted">
                        KG: $${producto.precio_kg} | UND: $${producto.precio_unidad} | LB: $${producto.precio_libra}
                    </div>
                </a>`)
                .on('click', function() {
                    seleccionarProducto(producto);
                })
                .appendTo(resultsDiv);
            });
        }
        resultsDiv.show();
    }

    // Función para seleccionar un producto
    function seleccionarProducto(producto) {
        $('#producto').val(producto.id).trigger('change');
        productoInput.val(producto.codigo + ' - ' + producto.nombre);
        $('#resultadosProductos').hide();
        const unidadMedida = $('#unidadMedida').val();
        actualizarPrecioSegunUnidad(producto, unidadMedida);
        $('#cantidad').focus();
    }

    // Actualizar los manejadores de teclas rápidas
    $(document).on('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'b') {
                e.preventDefault();
                productoInput.focus();
            }
            // ... resto del código de teclas rápidas ...
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            if (e.key === '/') {
                e.preventDefault();
                productoInput.focus();
            }
        }
    });

    // Cerrar resultados al hacer clic fuera
    $(document).on('click', function(e) {
        if (!$(e.target).closest('#buscarProductoInput, #resultadosProductos').length) {
            $('#resultadosProductos').hide();
        }
    });

    // Actualizar el manejador del botón de búsqueda
    $('#buscarProducto').on('click', function(e) {
        e.preventDefault();
        productoInput.focus();
    });

    // Manejar cambio de unidad de medida
    $('#unidadMedida').on('change', function() {
        const producto = $('#producto').select2('data')[0];
        if (producto) {
            actualizarPrecioSegunUnidad(producto, $(this).val());
        }
    });

    // Función para actualizar precio según unidad de medida
    function actualizarPrecioSegunUnidad(producto, unidad) {
        let precio = 0;
        switch(unidad) {
            case 'KG':
                precio = producto.precio_kg;
                break;
            case 'UND':
                precio = producto.precio_unidad;
                break;
            case 'LB':
                precio = producto.precio_libra;
                break;
        }
        $('#precio').val(precio);
    }

    // Agregar producto a la factura
    $('#agregarProducto').click(function() {
        const producto = $('#producto').select2('data')[0];
        if (!producto) {
            swalBootstrap.fire({
                title: 'Producto Requerido',
                text: 'Por favor seleccione un producto para continuar',
                icon: 'warning',
                confirmButtonText: 'Entendido',
                customClass: {
                    container: 'my-swal',
                    popup: 'rounded-3',
                    confirmButton: 'btn btn-primary px-4'
                },
                buttonsStyling: false
            });
            return;
        }

        const cantidad = parseFloat($('#cantidad').val());
        if (!cantidad || cantidad <= 0) {
            mostrarAlerta('warning', 'Por favor ingrese una cantidad válida');
            return;
        }

        const unidadMedida = $('#unidadMedida').val();
        const precio = parseFloat($('#precio').val());
        const subtotal = cantidad * precio;

        productosFactura.push({
            id: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            cantidad: cantidad,
            precio_unitario: precio,
            unidad_medida: unidadMedida,
            subtotal: subtotal
        });

        actualizarTablaProductos();
        limpiarFormularioProducto();
        $('#producto').focus();
    });

    // Función para actualizar la tabla de productos
    function actualizarTablaProductos() {
        const tbody = $('#productosTabla');
        tbody.empty();

        totalFactura = 0;
        productosFactura.forEach((item, index) => {
            totalFactura += item.subtotal;
            tbody.append(`
                <tr>
                    <td>${item.codigo} - ${item.nombre}</td>
                    <td class="text-end">${item.cantidad}</td>
                    <td>${item.unidad_medida}</td>
                    <td class="text-end">$${item.precio_unitario.toFixed(2)}</td>
                    <td class="text-end">$${item.subtotal.toFixed(2)}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarProductoFactura(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        $('#totalFactura').text(totalFactura.toFixed(2));
    }

    // Función para limpiar el formulario de producto
    function limpiarFormularioProducto() {
        $('#producto').val(null).trigger('change');
        $('#cantidad').val('');
        $('#precio').val('');
    }

    // Función para limpiar el formulario
    function limpiarFormulario() {
        productosFactura = [];
        totalFactura = 0;
        actualizarTablaProductos();
        $('#cliente').val(null).trigger('change');
        $('#infoCliente').hide();
        $('#formaPago').val('efectivo');
        
        // Limpiar el ID del pedido
        localStorage.removeItem('pedidoActualId');
    }

    // Función para ver pedidos guardados
    $('#verPedidos').click(function() {
        const tbody = $('#pedidosGuardados');
        tbody.empty();

        if (pedidosGuardados.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="bi bi-inbox h3 d-block"></i>
                        No hay pedidos guardados
                    </td>
                </tr>
            `);
        } else {
            pedidosGuardados.forEach((pedido, index) => {
                const productosResumen = pedido.productos.map(p => p.nombre).join(', ');
                
                tbody.append(`
                    <tr>
                        <td>
                            <strong>${pedido.cliente_nombre}</strong><br>
                            <small class="text-muted">
                                ${pedido.telefono}<br>
                                ${pedido.direccion}
                            </small>
                        </td>
                        <td><small>${productosResumen}</small></td>
                        <td>$${pedido.total.toFixed(2)}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-primary" onclick="cargarPedido(${index})" title="Cargar pedido">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                                <button class="btn btn-danger" onclick="eliminarPedido(${index})" title="Eliminar pedido">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
            });
        }

        $('#pedidosModal').modal('show');
    });

    // Función para eliminar pedido
    window.eliminarPedido = function(index) {
        console.log('Eliminando pedido, índice:', index);
        if (confirm('¿Está seguro de eliminar este pedido?')) {
            pedidosGuardados.splice(index, 1);
            actualizarLocalStorage();
            $('#verPedidos').click();
            mostrarAlerta('success', 'Pedido eliminado exitosamente');
        }
    };
}); 