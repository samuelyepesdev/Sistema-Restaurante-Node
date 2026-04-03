$(document).ready(function () {
    let timeoutCliente;
    let timeoutProducto;
    let pedidosGuardados = JSON.parse(localStorage.getItem('pedidos') || '[]');
    let productosFactura = [];
    let totalFactura = 0;

    // Funciones de persistencia
    function guardarSesionProvisional() {
        const sesion = {
            productos: productosFactura,
            clienteId: $('#cliente_id').val(),
            clienteNombre: $('#cliente').val(),
            direccion: $('#direccionCliente').text(),
            telefono: $('#telefonoCliente').text()
        };
        localStorage.setItem('pos_sesion_provisional', JSON.stringify(sesion));
    }

    function cargarSesionProvisional() {
        const data = localStorage.getItem('pos_sesion_provisional');
        if (!data) return;
        try {
            const sesion = JSON.parse(data);
            if (sesion.productos && sesion.productos.length > 0) {
                productosFactura = sesion.productos;
                actualizarTablaProductos();
            }
            if (sesion.clienteId) {
                seleccionarCliente({
                    id: sesion.clienteId,
                    nombre: sesion.clienteNombre,
                    direccion: sesion.direccion,
                    telefono: sesion.telefono
                });
            }
        } catch (e) { console.error("Error cargando sesión provisional", e); }
    }

    function limpiarSesionProvisional() {
        localStorage.removeItem('pos_sesion_provisional');
    }

    function actualizarLocalStorage() {
        localStorage.setItem('pedidos', JSON.stringify(pedidosGuardados));
    }

    // Cliente por defecto
    function getOrCreateConsumidorFinal() {
        return fetch('/api/clientes/buscar?q=consumidor%20final')
            .then(r => r.json())
            .then(list => {
                let cf = (list || []).find(c => (c.nombre || '').toLowerCase() === 'consumidor final');
                if (cf) return cf;
                return fetch('/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: 'Consumidor final' })
                }).then(r => r.ok ? r.json() : null);
            }).catch(() => null);
    }

    // Inicialización
    cargarSesionProvisional();
    getOrCreateConsumidorFinal().then(cf => {
        if (!$('#cliente_id').val() && cf) seleccionarCliente(cf);
    });

    // Búsqueda de clientes (usa 'input' para mejor soporte en móvil)
    $('#cliente').on('input', function () {
        clearTimeout(timeoutCliente);
        const valor = $(this).val();
        if (valor.length < 2) return;
        timeoutCliente = setTimeout(() => {
            $.ajax({
                url: '/api/clientes/buscar',
                data: { q: valor },
                success: function (clientes) {
                    if (clientes.length === 0) { $('#infoCliente').hide(); return; }
                    if (clientes.length === 1) seleccionarCliente(clientes[0]);
                    else mostrarListaClientes(clientes);
                }
            });
        }, 300);
    });

    function seleccionarCliente(cliente) {
        if (!cliente || !cliente.id) return;
        $('#cliente').val(cliente.nombre);
        $('#cliente_id').val(cliente.id);
        $('#direccionCliente').text(cliente.direccion || 'No especificada');
        $('#telefonoCliente').text(cliente.telefono || 'No especificado');
        $('#infoCliente').slideDown();
        guardarSesionProvisional();
        if (typeof updateStepIndicator === 'function') {
            updateStepIndicator(1, true);
            updateStepIndicator(2, false);
        }
    }

    function mostrarListaClientes(clientes) {
        const $container = $('#cliente').closest('.search-container');
        $container.find('.search-results').remove();
        const $lista = $('<div class="search-results active" style="z-index: 9999%;">');
        clientes.forEach(cliente => {
            $('<a href="#" class="search-item">')
                .append($('<div class="item-info">').append($('<span class="item-name">').text(cliente.nombre), $('<span class="small text-muted">').text(cliente.telefono || '')))
                .click(e => {
                    e.preventDefault();
                    seleccionarCliente(cliente);
                    $lista.remove();
                }).appendTo($lista);
        });
        $container.append($lista.show());
    }

    // Búsqueda de productos (usa 'input' para mejor soporte en móvil)
    $('#producto').on('input', function () {
        clearTimeout(timeoutProducto);
        const valor = $(this).val().trim();
        const $res = $('#resultadosProductos');
        if (valor.length < 2) { $res.hide(); return; }

        // Show loading state optionally
        $res.html('<div class="p-2 text-muted small text-center"><div class="spinner-border spinner-border-sm me-1" role="status"></div> Buscando...</div>').show();

        timeoutProducto = setTimeout(() => {
            $.ajax({
                url: '/api/productos/buscar',
                data: { q: valor },
                success: productos => mostrarListaProductos(productos),
                error: (xhr) => {
                    console.error('Error buscando productos:', xhr.status, xhr.responseText);
                    $res.html('<div class="p-3 text-danger small text-center"><i class="bi bi-exclamation-triangle"></i> Error en la búsqueda</div>').show();
                }
            });
        }, 300);
    });

    function mostrarListaProductos(productos) {
        const $res = $('#resultadosProductos').empty();
        if (!productos || !productos.length) {
            $res.html('<div class="p-3 text-muted small text-center"><i class="bi bi-search"></i> No se encontraron productos</div>').show();
            return;
        }
        productos.forEach(p => {
            const precio = (Number(p.precio_unidad) || 0).toLocaleString('es-CO');
            $('<a href="#" class="search-item">')
                .append($('<div class="item-info">').append($('<span class="item-name">').text(p.nombre), $('<small class="text-muted">').text(p.codigo || '')), $('<div class="item-price">').text(`$${precio}`))
                .click(e => { e.preventDefault(); agregarProductoALista(p); $res.hide(); })
                .appendTo($res);
        });
        $res.show();
    }


    function agregarProductoALista(p) {
        const precio = Number(p.precio_unidad) || 0;
        const item = { producto_id: p.id, nombre: p.nombre, cantidad: 1, unidad: 'UND', precio_original: precio, precio, descuento_porcentaje: 0 };
        productosFactura.push(item);
        actualizarTablaProductos();
        $('#producto').val('').focus();
    }

    function subtotalLinea(item) {
        return item.cantidad * item.precio * (1 - (item.descuento_porcentaje || 0) / 100);
    }

    function actualizarTablaProductos() {
        const tbody = $('#productosTabla').empty();
        totalFactura = 0;
        if (!productosFactura.length) {
            tbody.append('<tr><td colspan="6" class="empty-state" style="padding:3.5rem 2rem;"><i class="bi bi-cart-x"></i><div class="fw-semibold mt-2">Sin productos en la venta</div><small class="text-muted d-block mt-1">Escribe en el buscador de arriba para agregar productos</small></td></tr>');
            $('#productosListaMobile').html('<div class="empty-state py-4"><i class="bi bi-cart-x"></i><div class="fw-semibold mt-2">Sin productos</div><small class="text-muted d-block mt-1">Usa el buscador para agregar</small></div>');
            $('#totalFactura').text('0.00');
            return;
        }
        productosFactura.forEach((it, idx) => {
            it.subtotal = subtotalLinea(it);
            totalFactura += it.subtotal;
            tbody.append(`<tr>
                <td>${it.nombre} ${it.descuento_porcentaje > 0 ? `<span class="badge bg-success">-${it.descuento_porcentaje}%</span>` : ''}</td>
                <td class="text-center text-nowrap">
                    <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCant(${idx},-1)"><i class="bi bi-dash"></i></button>
                    <input type="number" class="form-control form-control-sm text-center d-inline-block mx-1" style="width: 70px;" value="${it.cantidad}" onchange="setCant(${idx}, this.value)" min="1">
                    <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCant(${idx},1)"><i class="bi bi-plus"></i></button>
                </td>
                <td>${it.unidad}</td>
                <td class="text-end">$${it.precio.toLocaleString('es-CO')}</td>
                <td class="text-end">$${it.subtotal.toLocaleString('es-CO')}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalDescuento(${idx})"><i class="bi bi-percent"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${idx})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`);
        });
        actualizarMobile();
        $('#totalFactura').text(totalFactura.toLocaleString('es-CO'));
        guardarSesionProvisional();
    }

    function actualizarMobile() {
        let html = '';
        productosFactura.forEach((it, idx) => {
            html += `<div class="producto-mobile-card p-2 mb-2 bg-white border rounded">
                <div class="fw-bold small">${it.nombre}</div>
                <div class="d-flex align-items-center gap-2 my-1">
                    <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCant(${idx},-1)"><i class="bi bi-dash"></i></button>
                    <input type="number" class="form-control form-control-sm text-center d-inline-block" style="width: 60px;" value="${it.cantidad}" onchange="setCant(${idx}, this.value)" min="1">
                    <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCant(${idx},1)"><i class="bi bi-plus"></i></button>
                </div>
                <div class="small text-muted">Unit. $${it.precio.toLocaleString('es-CO')} | Sub. $${it.subtotal.toLocaleString('es-CO')}</div>
                <div class="d-flex gap-1 mt-2">
                    <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="abrirModalDescuento(${idx})"><i class="bi bi-percent"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${idx})"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        });
        $('#productosListaMobile').html(html);
    }

    window.cambiarCant = (idx, c) => {
        const it = productosFactura[idx];
        it.cantidad = Math.max(0, it.cantidad + c);
        if (it.cantidad === 0) productosFactura.splice(idx, 1);
        actualizarTablaProductos();
    };

    window.setCant = (idx, val) => {
        const it = productosFactura[idx];
        const v = parseInt(val, 10);
        if (isNaN(v) || v <= 0) {
            it.cantidad = 1;
        } else {
            it.cantidad = v;
        }
        actualizarTablaProductos();
    };

    window.eliminarProducto = idx => { productosFactura.splice(idx, 1); actualizarTablaProductos(); };

    // Modal nuevo cliente
    $('#guardarCliente').click(function () {
        const data = {
            nombre: $('#nombreCliente').val().trim(),
            direccion: $('#direccionNuevoCliente').val().trim(),
            telefono: $('#telefonoNuevoCliente').val().trim()
        };
        if (!data.nombre) return Swal.fire('Error', 'El nombre es obligatorio', 'warning');
        const $btn = $(this).prop('disabled', true).text('Guardando...');
        $.ajax({
            url: '/api/clientes',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: res => {
                seleccionarCliente({ id: res.id, ...data });
                bootstrap.Modal.getInstance(document.getElementById('nuevoClienteModal')).hide();
                $('#formNuevoCliente')[0].reset();
                Swal.fire('Éxito', 'Cliente guardado', 'success');
            },
            error: () => Swal.fire('Error', 'No se pudo guardar el cliente', 'error'),
            complete: () => $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i> Guardar')
        });
    });

    // Descuentos
    window.abrirModalDescuento = idx => {
        window._descIdx = idx;
        const it = productosFactura[idx];
        $('#descuentoModalProducto').text(it.nombre);
        $('#descuentoModalPrecioActual').text(it.precio.toLocaleString('es-CO'));
        $('#descuentoPorcentajeManual').val(it.descuento_porcentaje || '');
        $('#nuevoPrecioManual').val(it.precio);
        new bootstrap.Modal(document.getElementById('descuentoModal')).show();
    };

    $(document).on('click', '.btn-descuento-quick', function () { aplicarDescPct($(this).data('pct')); });
    $('#btnAplicarPctManual').click(() => aplicarDescPct($('#descuentoPorcentajeManual').val()));
    $('#btnAplicarPrecioFijo').click(() => {
        const it = productosFactura[window._descIdx];
        it.precio = parseFloat($('#nuevoPrecioManual').val()) || it.precio;
        it.descuento_porcentaje = 0;
        actualizarTablaProductos();
        bootstrap.Modal.getInstance(document.getElementById('descuentoModal')).hide();
    });

    function aplicarDescPct(p) {
        const it = productosFactura[window._descIdx];
        it.descuento_porcentaje = parseFloat(p) || 0;
        actualizarTablaProductos();
        bootstrap.Modal.getInstance(document.getElementById('descuentoModal')).hide();
    }

    $('#quitarDescuentoBtn').click(() => {
        const it = productosFactura[window._descIdx];
        it.precio = it.precio_original;
        it.descuento_porcentaje = 0;
        actualizarTablaProductos();
        bootstrap.Modal.getInstance(document.getElementById('descuentoModal')).hide();
    });

    // Facturación
    $('#generarFactura').click(function () {
        const cid = $('#cliente_id').val();
        if (!cid) return Swal.fire('Atención', 'Seleccione un cliente', 'warning');
        if (!productosFactura.length) return Swal.fire('Atención', 'Agregue productos', 'warning');

        Swal.fire({ title: 'Generando factura...', didOpen: () => Swal.showLoading() });
        $.ajax({
            url: '/api/facturas',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                cliente_id: cid,
                total: totalFactura,
                forma_pago: $('#formaPago').val(),
                evento_id: $('#eventoId').val() || null,
                productos: productosFactura.map(p => ({
                    producto_id: p.producto_id,
                    cantidad: p.cantidad,
                    precio: p.precio * (1 - (p.descuento_porcentaje || 0) / 100),
                    precio_original: p.precio_original,
                    unidad: p.unidad,
                    subtotal: subtotalLinea(p),
                    descuento_porcentaje: p.descuento_porcentaje || null
                }))
            }),
            success: res => {
                Swal.close();
                const modal = new bootstrap.Modal(document.getElementById('facturaModal'));
                $('#facturaFrame').attr('src', `/api/facturas/${res.id}/imprimir`);
                modal.show();
                limpiarSesionProvisional();
                limpiarTodo();
            },
            error: xhr => Swal.fire('Error', xhr.responseJSON?.error || 'No se pudo generar factura', 'error')
        });
    });

    function limpiarTodo() {
        productosFactura = [];
        totalFactura = 0;
        actualizarTablaProductos();
        $('#infoCliente').hide();
        $('#cliente_id').val('');
        $('#cliente').val('');
        getOrCreateConsumidorFinal().then(cf => cf && seleccionarCliente(cf));
    }

    $('#nuevaVenta').click(() => { limpiarSesionProvisional(); limpiarTodo(); });

    // ========================================
    // Lógica de Stepper (Navegación por Pasos)
    // ========================================
    let currentStep = 1;

    function goToStep(step) {
        if (step < 1 || step > 4) return;

        // Validaciones antes de avanzar
        if (step > currentStep) {
            if (currentStep === 1 && !$('#cliente_id').val()) {
                return Swal.fire('Atención', 'Por favor seleccione un cliente para continuar', 'warning');
            }
            if (currentStep === 2 && productosFactura.length === 0) {
                return Swal.fire('Atención', 'Agregue al menos un producto a la venta', 'warning');
            }
        }

        currentStep = step;

        // Visualización de contenido
        $('.step-content').removeClass('active');
        $(`#content-step-${currentStep}`).addClass('active');

        // Actualización de indicadores
        updateStepVisuals();

        // Control de botones
        $('#btnStepBack').css('visibility', currentStep === 1 ? 'hidden' : 'visible');
        
        if (currentStep === 4) {
            $('#btnStepNext').fadeOut();
            actualizarResumenFinal();
        } else {
            $('#btnStepNext').fadeIn();
        }

        // Scroll al inicio del card
        $('.flow-card')[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateStepVisuals() {
        const icons = { 1: 'person', 2: 'box-seam', 3: 'credit-card', 4: 'file-earmark-text' };
        $('.step-item').each(function() {
            const stepNum = $(this).data('step');
            $(this).removeClass('active completed');
            
            if (stepNum === currentStep) {
                $(this).addClass('active');
                $(this).find('.step-circle').html(`<i class="bi bi-${icons[stepNum]}"></i>`);
            } else if (stepNum < currentStep) {
                $(this).addClass('completed');
                $(this).find('.step-circle').html('<i class="bi bi-check-lg"></i>');
            } else {
                $(this).find('.step-circle').html(`<i class="bi bi-${icons[stepNum]}"></i>`);
            }
        });
    }

    function actualizarResumenFinal() {
        const subtotal = totalFactura;
        const total = subtotal;

        $('#resumenSubtotal').text(`$${subtotal.toLocaleString('es-CO')}`);
        $('#resumenTotal').text(total.toLocaleString('es-CO'));
        const descTotal = productosFactura.reduce((s, p) => s + (p.precio_original * p.cantidad - subtotalLinea(p)), 0);
        $('#resumenDescuento').text(`-$${descTotal.toLocaleString('es-CO')}`);
    }

    $('#btnStepNext').click(() => goToStep(currentStep + 1));
    $('#btnStepBack').click(() => goToStep(currentStep - 1));

    $('input[name="forma_pago_radio"]').change(function() {
        $('#formaPago').val($(this).val());
    });

    $(document).on('click', '.step-item.completed, .step-item.active', function() {
        goToStep($(this).data('step'));
    });

    // Cierre de dropdowns al hacer clic fuera
    $(document).on('click', e => { if (!$(e.target).closest('.search-container').length) $('#resultadosProductos').hide(); });
});
