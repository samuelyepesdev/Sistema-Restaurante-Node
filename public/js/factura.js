$(document).ready(function() {
    let timeoutCliente;
    let timeoutProducto;
    let pedidosGuardados = JSON.parse(localStorage.getItem('pedidos') || '[]');
    let pedidoActualId = null; // Para rastrear el ID del pedido cargado

    // Obtener o crear cliente "Consumidor final" (siempre es el cliente por defecto)
    function getOrCreateConsumidorFinal() {
        return fetch('/api/clientes/buscar?q=consumidor%20final')
            .then(function(r) { return r.json(); })
            .then(function(list) {
                var cf = (list || []).find(function(c) { return (c.nombre || '').toLowerCase() === 'consumidor final'; });
                if (cf) return cf;
                return fetch('/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: 'Consumidor final' })
                }).then(function(r) {
                    if (r.ok) return r.json().then(function(data) { return { id: data.id, nombre: 'Consumidor final' }; });
                    return null;
                });
            })
            .catch(function() { return null; });
    }

    // Función para actualizar localStorage
    function actualizarLocalStorage() {
        localStorage.setItem('pedidos', JSON.stringify(pedidosGuardados));
    }
    
    // Función para actualizar indicadores de pasos
    function updateStepIndicator(stepNum, completed) {
        const step = $(`#step${stepNum}`);
        if (!step.length) return; // Si no existe el elemento, salir
        step.removeClass('active completed');
        if (completed) {
            step.addClass('completed');
            step.find('.step-number').html('<i class="bi bi-check"></i>');
        } else if (stepNum === getCurrentStep()) {
            step.addClass('active');
        }
    }
    
    function getCurrentStep() {
        const productosFactura = window.productosFactura || [];
        if (productosFactura.length > 0) return 3;
        if ($('#cliente').val() || $('#cliente_id').val()) return 2;
        return 1;
    }

    // Búsqueda de clientes
    $('#cliente').on('keyup', function() {
        clearTimeout(timeoutCliente);
        const valor = $(this).val();
        
        if (valor.length < 2) return;

        timeoutCliente = setTimeout(() => {
            $.ajax({
                url: '/api/clientes/buscar',
                data: { q: valor },
                success: function(clientes) {
                    if (clientes.length === 0) {
                        $('#infoCliente').hide();
                        return;
                    }
                    
                    // Si solo hay un cliente, seleccionarlo automáticamente
                    if (clientes.length === 1) {
                        seleccionarCliente(clientes[0]);
                    } else {
                        // Aquí podrías mostrar una lista de clientes para seleccionar
                        mostrarListaClientes(clientes);
                    }
                }
            });
        }, 300);
    });

    // Búsqueda de productos: al seleccionar uno se agrega directo a la venta (como en Mesas)
    $('#producto').on('keyup', function() {
        clearTimeout(timeoutProducto);
        const valor = $(this).val().trim();
        const $resultados = $('#resultadosProductos');
        if (valor.length < 2) {
            $resultados.empty().hide();
            return;
        }
        timeoutProducto = setTimeout(() => {
            $.ajax({
                url: '/api/productos/buscar',
                data: { q: valor },
                success: function(productos) {
                    if (!productos || productos.length === 0) {
                        $resultados.empty().hide();
                        return;
                    }
                    if (productos.length === 1) {
                        agregarProductoALista(productos[0]);
                        $resultados.empty().hide();
                        return;
                    }
                    mostrarListaProductos(productos);
                }
            });
        }, 300);
    });

    // Función para seleccionar cliente
    function seleccionarCliente(cliente) {
        if (!cliente || !cliente.id) {
            console.error('Cliente inválido:', cliente);
            return;
        }

        // Actualizar campos visibles
        $('#cliente').val(cliente.nombre);
        $('#cliente_id').val(cliente.id);
        
        // Actualizar información del cliente
        $('#direccionCliente').text(cliente.direccion || 'No especificada');
        $('#telefonoCliente').text(cliente.telefono || 'No especificado');
        
        // Mostrar el panel de información
        $('#infoCliente').slideDown();
        
        // Actualizar pasos
        if (typeof updateStepIndicator === 'function') {
            updateStepIndicator(1, true);
            updateStepIndicator(2, false);
        }
    }

    // Calcular subtotal de una línea (con descuento si existe)
    function subtotalLinea(item) {
        const pct = (item.descuento_porcentaje || 0) / 100;
        return item.cantidad * item.precio * (1 - pct);
    }

    // Agregar producto a la venta (como en Mesas: buscar → clic → se agrega)
    function agregarProductoALista(producto) {
        if (!producto || !producto.id) return;
        const precio = Number(producto.precio_unidad) || 0;
        const item = {
            producto_id: producto.id,
            nombre: producto.nombre,
            cantidad: 1,
            unidad: 'UND',
            precio: precio,
            descuento_porcentaje: 0,
            subtotal: precio
        };
        item.subtotal = subtotalLinea(item);
        productosFactura.push(item);
        actualizarTablaProductos();
        $('#producto').val('');
        $('#producto_id').val('');
        $('#resultadosProductos').empty().hide();
        $('#producto').focus();
    }

    // Función para mostrar lista de clientes
    function mostrarListaClientes(clientes) {
        const lista = $('<div class="list-group search-results">');
        clientes.forEach(cliente => {
            lista.append(
                $('<a href="#" class="list-group-item list-group-item-action">')
                    .text(`${cliente.nombre} ${cliente.telefono ? '- ' + cliente.telefono : ''}`)
                    .click(function(e) {
                        e.preventDefault();
                        seleccionarCliente(cliente);
                        lista.remove();
                    })
            );
        });
        $('#cliente').closest('.search-container').append(lista);
    }

    // Mostrar lista de productos bajo el buscador; al clic se agrega a la venta
    function mostrarListaProductos(productos) {
        const $resultados = $('#resultadosProductos');
        $resultados.empty();
        productos.forEach(function(producto) {
            const precioUnd = Number(producto.precio_unidad) || 0;
            const $item = $('<a href="#" class="list-group-item list-group-item-action">')
                .html(
                    '<div><strong>' + (producto.codigo || '') + '</strong> - ' + (producto.nombre || '') + '</div>' +
                    '<div class="small text-muted">$' + precioUnd.toLocaleString('es-CO') + ' UND</div>'
                )
                .on('click', function(e) {
                    e.preventDefault();
                    agregarProductoALista(producto);
                });
            $resultados.append($item);
        });
        $resultados.show();
    }

    // Cerrar resultados de búsqueda al hacer clic fuera
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-container').length) {
            $('#resultadosProductos').empty().hide();
        }
    });

    // Cliente por defecto: siempre Consumidor final al cargar la página
    getOrCreateConsumidorFinal().then(function(cf) {
        if (cf && cf.id) {
            seleccionarCliente({
                id: cf.id,
                nombre: cf.nombre || 'Consumidor final',
                direccion: cf.direccion || '',
                telefono: cf.telefono || ''
            });
        }
    });

    // Variables para la factura
    let productosFactura = [];
    let totalFactura = 0;

    // Actualizar tabla de productos con cantidad +/- (como en Mesas)
    function actualizarTablaProductos() {
        const tbody = $('#productosTabla');
        tbody.empty();
        totalFactura = 0;

        if (productosFactura.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="bi bi-cart-x"></i>
                        <div>No hay productos agregados</div>
                        <small class="text-muted">Busque un producto arriba y selecciónelo para agregarlo</small>
                    </td>
                </tr>
            `);
            $('#productosListaMobile').html(
                '<div class="empty-state py-4"><i class="bi bi-cart-x"></i><div>No hay productos agregados</div><small class="text-muted">Busque un producto arriba y selecciónelo</small></div>'
            );
            $('#totalFactura').text('0.00');
            return;
        }

        productosFactura.forEach((item, index) => {
            item.subtotal = subtotalLinea(item);
            totalFactura += item.subtotal;
            var descBadge = (item.descuento_porcentaje && item.descuento_porcentaje > 0) ? '<span class="badge bg-success ms-1">-' + item.descuento_porcentaje + '%</span>' : '';
            tbody.append(`
                <tr>
                    <td>${item.nombre}${descBadge}</td>
                    <td class="text-center">
                        <div class="d-flex align-items-center justify-content-center gap-1">
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="quitarCantidadFactura(${index})" title="Quitar"><i class="bi bi-dash"></i></button>
                            <span style="min-width:2rem;display:inline-block">${item.cantidad}</span>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="agregarCantidadFactura(${index})" title="Agregar"><i class="bi bi-plus"></i></button>
                        </div>
                    </td>
                    <td>${item.unidad}</td>
                    <td class="text-end">$${Number(item.precio).toLocaleString('es-CO')}</td>
                    <td class="text-end">$${Number(item.subtotal).toLocaleString('es-CO')}</td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalDescuento(${index})" title="Aplicar descuento"><i class="bi bi-percent"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${index})" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `);
        });

        // Vista móvil: tarjetas con nombre, cantidad (+/- pequeños), unitario/subtotal, descuento, eliminar
        var mobileHtml = '';
        productosFactura.forEach(function(item, index) {
            var precioStr = Number(item.precio).toLocaleString('es-CO');
            var subtotalStr = Number(item.subtotal).toLocaleString('es-CO');
            var descBadge = (item.descuento_porcentaje && item.descuento_porcentaje > 0) ? ' <span class="badge bg-success">-' + item.descuento_porcentaje + '%</span>' : '';
            mobileHtml +=
                '<div class="producto-mobile-card border rounded p-2 mb-2 bg-white">' +
                '<div class="fw-semibold small">' + item.nombre + descBadge + '</div>' +
                '<div class="d-flex align-items-center gap-2 mt-1">' +
                '<button type="button" class="btn btn-sm p-1 btn-outline-secondary" onclick="quitarCantidadFactura(' + index + ')" title="Quitar"><i class="bi bi-dash" style="font-size:0.9rem"></i></button>' +
                '<span style="min-width:1.5rem;text-align:center;font-size:0.9rem">' + item.cantidad + '</span>' +
                '<button type="button" class="btn btn-sm p-1 btn-outline-secondary" onclick="agregarCantidadFactura(' + index + ')" title="Agregar"><i class="bi bi-plus" style="font-size:0.9rem"></i></button>' +
                '</div>' +
                '<div class="small text-muted mt-1">Unit. $' + precioStr + ' · Subtotal $' + subtotalStr + '</div>' +
                '<div class="d-flex gap-1 mt-1">' +
                '<button type="button" class="btn btn-sm btn-outline-primary flex-grow-1" onclick="abrirModalDescuento(' + index + ')"><i class="bi bi-percent"></i> Descuento</button>' +
                '<button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(' + index + ')"><i class="bi bi-trash"></i></button>' +
                '</div>' +
                '</div>';
        });
        $('#productosListaMobile').html(mobileHtml);

        $('#totalFactura').text(totalFactura.toLocaleString('es-CO'));
    }

    window.quitarCantidadFactura = function(index) {
        if (index < 0 || index >= productosFactura.length) return;
        const item = productosFactura[index];
        if (item.cantidad <= 1) {
            productosFactura.splice(index, 1);
        } else {
            item.cantidad--;
            item.subtotal = subtotalLinea(item);
        }
        actualizarTablaProductos();
    };

    window.agregarCantidadFactura = function(index) {
        if (index < 0 || index >= productosFactura.length) return;
        const item = productosFactura[index];
        item.cantidad++;
        item.subtotal = subtotalLinea(item);
        actualizarTablaProductos();
    };

    // Modal descuento: abrir con índice de línea
    window.abrirModalDescuento = function(index) {
        if (index < 0 || index >= productosFactura.length) return;
        window._descuentoLineIndex = index;
        var item = productosFactura[index];
        $('#descuentoModalProducto').text(item.nombre + ' — $' + Number(item.subtotal).toLocaleString('es-CO'));
        var modal = new bootstrap.Modal(document.getElementById('descuentoModal'));
        modal.show();
    };

    // Aplicar porcentaje de descuento a la línea actual
    $(document).on('click', '.btn-descuento', function() {
        var pct = parseInt($(this).data('pct'), 10);
        var index = window._descuentoLineIndex;
        if (index == null || index < 0 || index >= productosFactura.length) return;
        var item = productosFactura[index];
        item.descuento_porcentaje = pct;
        item.subtotal = subtotalLinea(item);
        actualizarTablaProductos();
        bootstrap.Modal.getInstance(document.getElementById('descuentoModal')).hide();
    });

    $('#quitarDescuentoBtn').on('click', function() {
        var index = window._descuentoLineIndex;
        if (index != null && index >= 0 && index < productosFactura.length) {
            productosFactura[index].descuento_porcentaje = 0;
            productosFactura[index].subtotal = subtotalLinea(productosFactura[index]);
            actualizarTablaProductos();
        }
        bootstrap.Modal.getInstance(document.getElementById('descuentoModal')).hide();
    });

    // Función para eliminar producto
    window.eliminarProducto = function(index) {
        productosFactura.splice(index, 1);
        actualizarTablaProductos();
    };

    // Función para limpiar el formulario de producto
    function limpiarFormularioProducto() {
        $('#producto').val('');
        $('#producto_id').val('');
        $('#resultadosProductos').empty().hide();
    }

    // Función para limpiar el formulario completo
    function limpiarFormulario(mantenerPedidoId = false) {
        productosFactura = [];
        totalFactura = 0;
        actualizarTablaProductos();
        $('#cliente').val('');
        $('#cliente_id').val('');
        $('#infoCliente').hide();
        $('#formaPago').val('efectivo');
        limpiarFormularioProducto();
        
        // Solo limpiar el ID si no se indica mantenerlo
        if (!mantenerPedidoId) {
            localStorage.removeItem('pedidoActualId');
        }
    }

    // Nueva venta: limpiar todo y dejar Consumidor final para empezar de nuevo
    $('#nuevaVenta').on('click', function() {
        limpiarFormulario();
        getOrCreateConsumidorFinal().then(function(cf) {
            if (cf && cf.id) {
                seleccionarCliente({ id: cf.id, nombre: cf.nombre || 'Consumidor final', direccion: cf.direccion || '', telefono: cf.telefono || '' });
            }
        });
    });

    // Guardar pedido
    $('#guardarPedido').click(function() {
        console.log('=== INICIO GUARDADO DE PEDIDO ===');
        const cliente_id = $('#cliente_id').val();
        const cliente_nombre = $('#cliente').val();
        
        if (!cliente_id) {
            console.log('Error: No hay cliente seleccionado');
            mostrarAlerta('warning', 'Por favor seleccione un cliente');
            return;
        }

        if (productosFactura.length === 0) {
            console.log('Error: No hay productos en el pedido');
            mostrarAlerta('warning', 'Agregue al menos un producto al pedido');
            return;
        }

        const pedido = {
            id: Date.now(),
            cliente_id: cliente_id,
            cliente_nombre: cliente_nombre,
            direccion: $('#direccionCliente').text(),
            telefono: $('#telefonoCliente').text(),
            productos: JSON.parse(JSON.stringify(productosFactura)),
            total: totalFactura,
            forma_pago: $('#formaPago').val(),
            fecha: new Date().toLocaleString()
        };

        console.log('Pedido a guardar:', pedido);
        console.log('Pedidos guardados antes:', pedidosGuardados);
        
        pedidosGuardados.push(pedido);
        actualizarLocalStorage();
        
        console.log('Pedidos guardados después:', pedidosGuardados);
        console.log('LocalStorage actualizado');

        // No limpiar el formulario: el pedido se queda en pantalla para poder generar la factura
        mostrarAlerta('success', 'Pedido guardado. Puede generar la factura o guardar otro.');
        console.log('=== FIN GUARDADO DE PEDIDO ===');
    });

    // Función para cargar un pedido guardado
    window.cargarPedido = function(index) {
        console.log('=== INICIO CARGA DE PEDIDO ===');
        console.log('Índice del pedido a cargar:', index);
        
        const pedido = pedidosGuardados[index];
        console.log('Pedido encontrado:', pedido);
        
        if (!pedido) {
            console.error('No se encontró el pedido');
            return;
        }
        
        // Primero limpiar todo (sin eliminar el ID)
        productosFactura = [];
        totalFactura = 0;
        actualizarTablaProductos();
        $('#cliente').val('');
        $('#cliente_id').val('');
        $('#infoCliente').hide();
        $('#formaPago').val('efectivo');
        limpiarFormularioProducto();
        
        // Guardar el ID del pedido cargado
        localStorage.setItem('pedidoActualId', pedido.id);
        console.log('ID del pedido guardado en localStorage:', pedido.id);
        console.log('Verificación del ID guardado:', localStorage.getItem('pedidoActualId'));
        
        // Cargar información del cliente
        $('#cliente').val(pedido.cliente_nombre);
        $('#cliente_id').val(pedido.cliente_id);
        $('#direccionCliente').text(pedido.direccion || 'No especificada');
        $('#telefonoCliente').text(pedido.telefono || 'No especificado');
        $('#infoCliente').show();
        
        // Cargar productos
        productosFactura = pedido.productos;
        totalFactura = pedido.total;
        
        // Cargar forma de pago
        $('#formaPago').val(pedido.forma_pago || 'efectivo');
        
        // Actualizar la tabla de productos
        actualizarTablaProductos();
        
        // Cerrar el modal de pedidos
        $('#pedidosModal').modal('hide');
        
        console.log('=== FIN CARGA DE PEDIDO ===');
        console.log('Estado final:', {
            pedidoId: pedido.id,
            cliente: pedido.cliente_nombre,
            productos: productosFactura,
            total: totalFactura
        });
    };

    // Generar factura
    $('#generarFactura').click(function() {
        console.log('=== INICIO GENERACIÓN DE FACTURA ===');
        const cliente_id = $('#cliente_id').val() || $('#cliente').val();
        const forma_pago = $('#formaPago').val();
        
        if (!cliente_id) {
            mostrarAlerta('warning', 'Por favor seleccione un cliente primero');
            // Resaltar paso 1
            $('#step1').addClass('animate__animated animate__shakeX');
            setTimeout(() => $('#step1').removeClass('animate__animated animate__shakeX'), 1000);
            return;
        }

        if (productosFactura.length === 0) {
            mostrarAlerta('warning', 'Agregue al menos un producto a la factura');
            // Resaltar paso 2
            $('#step2').addClass('animate__animated animate__shakeX');
            setTimeout(() => $('#step2').removeClass('animate__animated animate__shakeX'), 1000);
            return;
        }
        
        // Marcar paso 4 como activo
        updateStepIndicator(4, false);

        const evento_id = document.getElementById('eventoId') && document.getElementById('eventoId').value ? parseInt(document.getElementById('eventoId').value, 10) : null;
        const factura = {
            cliente_id: cliente_id,
            total: totalFactura,
            forma_pago: forma_pago,
            evento_id: evento_id || undefined,
            productos: productosFactura.map(p => {
                var desc = (p.descuento_porcentaje || 0) / 100;
                var precioFinal = p.precio * (1 - desc);
                return {
                    producto_id: p.producto_id,
                    cantidad: p.cantidad,
                    precio: Math.round(precioFinal * 100) / 100,
                    unidad: p.unidad,
                    subtotal: Math.round(p.subtotal * 100) / 100,
                    descuento_porcentaje: (p.descuento_porcentaje && p.descuento_porcentaje > 0) ? p.descuento_porcentaje : null
                };
            })
        };

        console.log('Factura a enviar:', factura);

        // Mostrar indicador de carga
        Swal.fire({
            title: 'Generando factura...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/api/facturas',
            method: 'POST',
            data: JSON.stringify(factura),
            contentType: 'application/json',
            success: function(response) {
                Swal.close();
                console.log('Factura generada exitosamente:', response);
                
                if (response && response.id) {
                    // No borrar el pedido guardado: se mantiene en la lista por si lo quieren reutilizar o consultar
                    localStorage.removeItem('pedidoActualId');

                    // Mostrar la factura
                    const facturaModal = new bootstrap.Modal(document.getElementById('facturaModal'));
                    const iframeUrl = `/api/facturas/${response.id}/imprimir`;
                    console.log('URL del iframe:', iframeUrl);
                    $('#facturaFrame').attr('src', iframeUrl);
                    facturaModal.show();

                    // Marcar paso 4 como completado
                    if (typeof updateStepIndicator === 'function') {
                        updateStepIndicator(4, true);
                    }
                    
                    // Limpiar el formulario y volver a dejar Consumidor final como cliente
                    limpiarFormulario();
                    getOrCreateConsumidorFinal().then(function(cf) {
                        if (cf && cf.id) {
                            seleccionarCliente({ id: cf.id, nombre: cf.nombre || 'Consumidor final', direccion: cf.direccion || '', telefono: cf.telefono || '' });
                        }
                    });
                    mostrarAlerta('success', response.numero != null ? 'Factura #' + response.numero + ' generada exitosamente' : 'Factura generada exitosamente');
                } else {
                    mostrarAlerta('error', 'Error: No se recibió el ID de la factura');
                }
            },
            error: function(xhr, status, error) {
                Swal.close();
                console.error('Error al generar factura:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText,
                    error: error
                });

                let mensajeError = 'Error al generar la factura';
                if (xhr.status === 0) {
                    mensajeError = 'No se pudo conectar con el servidor. Por favor, verifica tu conexión.';
                } else {
                    try {
                        const respuesta = JSON.parse(xhr.responseText);
                        mensajeError = respuesta.error || mensajeError;
                    } catch (e) {
                        console.error('Error al parsear respuesta:', e);
                        if (xhr.responseText) {
                            mensajeError = xhr.responseText;
                        }
                    }
                }
                
                mostrarAlerta('error', mensajeError);
            }
        });
    });

    // Ver pedidos guardados
    $('#verPedidos').click(function() {
        console.log('=== MOSTRANDO PEDIDOS GUARDADOS ===');
        const tbody = $('#pedidosGuardados');
        tbody.empty();

        console.log('Pedidos en memoria:', pedidosGuardados);

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
                    <td>$${pedido.total.toLocaleString('es-CO')}</td>
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

    // Función para facturar pedido directamente
    window.facturarPedido = function(index) {
        console.log('=== INICIO FACTURACIÓN DIRECTA DE PEDIDO ===');
        console.log('Índice del pedido:', index);
        const pedido = pedidosGuardados[index];
        console.log('Pedido a facturar:', pedido);
        
        // Primero eliminar el pedido
        pedidosGuardados.splice(index, 1);
        actualizarLocalStorage();
        console.log('Pedido eliminado de la lista');
        
        // Cerrar el modal de pedidos
        $('#pedidosModal').modal('hide');
        
        // Cargar el pedido
        cargarPedido(pedido);
        
        // Generar la factura
        setTimeout(() => {
            $('#generarFactura').click();
        }, 500);
    };

    // Función para eliminar pedido
    window.eliminarPedido = function(index) {
        console.log('=== INICIO ELIMINACIÓN DE PEDIDO ===');
        console.log('Índice del pedido:', index);
            if (confirm('¿Está seguro de eliminar este pedido?')) {
            console.log('Pedidos antes de eliminar:', pedidosGuardados);
                pedidosGuardados.splice(index, 1);
                actualizarLocalStorage();
            console.log('Pedidos después de eliminar:', pedidosGuardados);
                $('#verPedidos').click();
            mostrarAlerta('success', 'Pedido eliminado exitosamente');
            console.log('=== FIN ELIMINACIÓN DE PEDIDO ===');
        }
    };

    // Función para mostrar alertas
    function mostrarAlerta(tipo, mensaje) {
        Swal.fire({
            icon: tipo,
            title: mensaje,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
}); 