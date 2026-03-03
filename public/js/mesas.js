// JS de Mesas: UI para abrir/gestionar pedidos por mesa y enviar a cocina
// Relacionado con: views/mesas.ejs, routes/mesas.js, routes/productos.js, routes/facturas.js

$(function () {
  const canvas = new bootstrap.Offcanvas('#canvasPedido');
  let pedidoActual = null; // { id, mesa_id }
  let items = []; // items del pedido en UI
  let descuentosPorItem = {}; // { itemId: percent } - solo para esta venta; no cambia el precio del producto en catálogo
  let propinaPedido = 0; // propina que deja el cliente (se suma al total)

  // Helpers UI
  function formatear(valor) { return `$${Number(valor || 0).toLocaleString('es-CO')}` }
  function subtotalConDescuento(cantidad, precio, itemId) {
    const pct = descuentosPorItem[itemId] != null ? descuentosPorItem[itemId] : 0;
    return cantidad * precio * (1 - pct / 100);
  }
  function renderItems() {
    const tbody = $('#tbodyItems');
    tbody.empty();
    let total = 0;
    items.forEach((it, idx) => {
      const cantidad = Number(it.cantidad || 0);
      const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
      const subtotal = subtotalConDescuento(cantidad, precio, it.id);
      total += subtotal;
      const descBadge = (descuentosPorItem[it.id] != null && descuentosPorItem[it.id] > 0)
        ? ' <span class="badge bg-success">-' + descuentosPorItem[it.id] + '%</span>' : '';
      tbody.append(`
        <tr>
          <td class="td-producto">${(it.producto_nombre || it.nombre || it.producto_id) + descBadge}</td>
          <td class="text-center">${cantidad}</td>
          <td class="text-end">${formatear(precio)}</td>
          <td class="text-end td-subtotal">${formatear(subtotal)}</td>
          <td class="text-center">
            <div class="btn-group-item">
              <button type="button" class="btn btn-sm btn-outline-secondary btn-menos-item" data-item-id="${it.id}" data-cantidad="${cantidad}" title="Quitar"><i class="bi bi-dash"></i></button>
              <button type="button" class="btn btn-sm btn-outline-secondary btn-mas-item" data-item-id="${it.id}" data-cantidad="${cantidad}" title="Agregar"><i class="bi bi-plus"></i></button>
              <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-item" data-idx="${idx}" data-item-id="${it.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `);
    });
    const totalConPropina = total + propinaPedido;
    $('#totalPedido').text(formatear(totalConPropina));
    $('#propinaLinea').toggleClass('d-none', propinaPedido <= 0);
    $('#propinaMonto').text(formatear(propinaPedido));
  }

  // +/- cantidad en items del pedido (mesa)
  $(document).on('click', '.btn-mas-item', async function () {
    const id = $(this).data('item-id');
    const cant = Number($(this).data('cantidad')) + 1;
    try {
      const r = await fetch(`/api/mesas/items/${id}/cantidad`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad: cant }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      await cargarPedido(pedidoActual.id);
    } catch (e) { Swal.fire({ icon: 'error', title: e.message }); }
  });

  $(document).on('click', '.btn-menos-item', async function () {
    const id = $(this).data('item-id');
    const cant = Number($(this).data('cantidad'));
    if (cant <= 1) return;
    try {
      const r = await fetch(`/api/mesas/items/${id}/cantidad`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad: cant - 1 }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      await cargarPedido(pedidoActual.id);
    } catch (e) { Swal.fire({ icon: 'error', title: e.message }); }
  });

  $(document).on('click', '.btn-eliminar-item', async function () {
    const idx = $(this).data('idx');
    const itemId = $(this).data('item-id');
    const it = items[idx];
    if (!it) return;
    const ok = await Swal.fire({ title: '¿Eliminar este item?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'Cancelar' });
    if (!ok.isConfirmed) return;
    try {
      const r = await fetch(`/api/mesas/items/${itemId}`, { method: 'DELETE' });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Error'); }
      await cargarPedido(pedidoActual.id);
      Swal.fire({ icon: 'success', title: 'Item eliminado' });
    } catch (e) { Swal.fire({ icon: 'error', title: e.message }); }
  });

  // Cargar pedido por mesa
  async function abrirPedido(mesaId, mesaNumero) {
    try {
      descuentosPorItem = {};
      propinaPedido = 0;
      const resp = await fetch('/api/mesas/abrir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mesa_id: mesaId }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al abrir pedido');
      pedidoActual = data.pedido;
      $('#pedidoMesa').text(mesaNumero);
      const $btnLiberar = $('#btnLiberarMesaHeader');
      if ($btnLiberar.length) $btnLiberar.prop('disabled', currentMesaEstado === 'libre').toggleClass('d-none', currentMesaEstado === 'libre');
      await cargarPedido(pedidoActual.id);
      canvas.show();
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.message });
    }
  }

  async function cargarPedido(pedidoId) {
    const resp = await fetch(`/api/mesas/pedidos/${pedidoId}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error al cargar pedido');
    items = data.items || [];
    propinaPedido = Number(data.pedido?.propina) || 0;
    if (items.length > 0) currentMesaEstado = 'ocupada';
    const $btnLiberar = $('#btnLiberarMesaHeader');
    if ($btnLiberar.length) $btnLiberar.prop('disabled', currentMesaEstado === 'libre').toggleClass('d-none', currentMesaEstado === 'libre');
    // No resetear descuentos aquí: se conservan para que al facturar se envíen. Solo se resetean al abrir otra mesa (abrirPedido).
    renderItems();
  }

  // Botón "Aplicar descuento" (arriba de Mover a mesa): paso 1 = elegir producto, paso 2 = elegir %
  $('#btnAplicarDescuentoMesa').on('click', function () {
    if (items.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No hay productos en el pedido', text: 'Agregue productos para aplicar un descuento.' });
      return;
    }
    const $lista = $('#descuentoMesaListaProductos');
    $lista.empty();
    items.forEach(function (it) {
      const nombre = it.producto_nombre || it.nombre || it.producto_id || 'Producto';
      const cantidad = Number(it.cantidad || 0);
      const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
      const subtotal = subtotalConDescuento(cantidad, precio, it.id);
      const descTexto = (descuentosPorItem[it.id] != null && descuentosPorItem[it.id] > 0) ? ' <span class="badge bg-success">-' + descuentosPorItem[it.id] + '%</span>' : '';
      const $a = $('<a href="#" class="list-group-item list-group-item-action"></a>')
        .html('<div><strong>' + nombre + '</strong>' + descTexto + '</div><div class="small text-muted">Cant: ' + cantidad + ' · ' + formatear(subtotal) + '</div>')
        .on('click', function (e) { e.preventDefault(); elegirProductoParaDescuento(it.id, nombre); });
      $lista.append($a);
    });
    $('#descuentoModalMesaTitulo').text('Seleccione el producto');
    $('#descuentoMesaPaso1').show();
    $('#descuentoMesaPaso2').hide();
    new bootstrap.Modal(document.getElementById('descuentoModalMesa')).show();
  });

  function elegirProductoParaDescuento(itemId, nombre) {
    window._descuentoItemIdMesa = itemId;
    const it = items.find(i => i.id === itemId);
    const subtotal = it ? formatear(subtotalConDescuento(Number(it.cantidad || 0), Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0), itemId)) : '$0';
    $('#descuentoModalProductoMesa').text(nombre + ' — ' + subtotal);
    $('#descuentoModalMesaTitulo').text('Aplicar descuento');
    $('#descuentoMesaPaso1').hide();
    $('#descuentoMesaPaso2').show();
  }

  $(document).on('click', '.btn-descuento-mesa', function () {
    const pct = parseInt($(this).data('pct'), 10);
    const itemId = window._descuentoItemIdMesa;
    if (itemId != null) { descuentosPorItem[itemId] = pct; renderItems(); }
    bootstrap.Modal.getInstance(document.getElementById('descuentoModalMesa')).hide();
  });
  $('#quitarDescuentoMesaBtn').on('click', function () {
    const itemId = window._descuentoItemIdMesa;
    if (itemId != null) { delete descuentosPorItem[itemId]; renderItems(); }
    bootstrap.Modal.getInstance(document.getElementById('descuentoModalMesa')).hide();
  });

  $('#descuentoModalMesa').on('hidden.bs.modal', function () {
    $('#descuentoMesaPaso1').show();
    $('#descuentoMesaPaso2').hide();
    $('#descuentoModalMesaTitulo').text('Aplicar descuento');
  });

  // Botón "Propina": abrir modal y aplicar/quitar propina
  $('#btnPropinaMesa').on('click', function () {
    if (!pedidoActual || !pedidoActual.id) {
      Swal.fire({ icon: 'warning', title: 'No hay pedido abierto' });
      return;
    }
    $('#propinaInputMesa').val(propinaPedido > 0 ? propinaPedido : '');
    new bootstrap.Modal(document.getElementById('propinaModalMesa')).show();
  });
  $('.btn-propina-rapida').on('click', function () {
    const val = Number($(this).data('val')) || 0;
    $('#propinaInputMesa').val(val);
  });
  $('#aplicarPropinaMesaBtn').on('click', async function () {
    const valor = Math.max(0, parseFloat($('#propinaInputMesa').val()) || 0);
    try {
      const r = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/propina`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propina: valor })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      propinaPedido = valor;
      renderItems();
      bootstrap.Modal.getInstance(document.getElementById('propinaModalMesa')).hide();
      if (valor > 0) Swal.fire({ icon: 'success', title: 'Propina aplicada', text: formatear(valor), timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire({ icon: 'error', title: e.message }); }
  });
  $('#quitarPropinaMesaBtn').on('click', async function () {
    try {
      const r = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/propina`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propina: 0 })
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Error'); }
      propinaPedido = 0;
      $('#propinaInputMesa').val('');
      renderItems();
      bootstrap.Modal.getInstance(document.getElementById('propinaModalMesa')).hide();
    } catch (e) { Swal.fire({ icon: 'error', title: e.message }); }
  });

  // Buscar productos
  let to;
  $('#buscarProductoMesa').on('input', function () {
    clearTimeout(to);
    const q = this.value.trim();
    if (q.length < 2) { $('#resultadosProductoMesa').empty(); return; }
    to = setTimeout(async () => {
      const resp = await fetch(`/api/productos/buscar?q=${encodeURIComponent(q)}`);
      const productos = await resp.json();
      const list = $('#resultadosProductoMesa');
      list.empty();
      productos.forEach(p => {
        const item = $(`
          <a href="#" class="list-group-item list-group-item-action">
            <div><strong>${p.codigo}</strong> - ${p.nombre}</div>
            <div class="small text-muted">KG: $${p.precio_kg} | UND: $${p.precio_unidad} | LB: $${p.precio_libra}</div>
          </a>`);
        item.on('click', e => {
          e.preventDefault();
          $('#resultadosProductoMesa').empty();
          $('#buscarProductoMesa').val('');
          seleccionarProducto(p);
        });
        list.append(item);
      });
    }, 250);
  });

  // Selección rápida: cantidad 1 por defecto. Nota para cocina solo si el producto es de categoría "Comidas"
  const CATEGORIA_COMIDAS = 'comidas';
  function esCategoriaComidas(p) {
    const nombre = (p.categoria_nombre || '').trim().toLowerCase();
    return nombre === CATEGORIA_COMIDAS;
  }

  async function seleccionarProducto(p) {
    await runWithOffcanvasHidden(async () => {
      let nota = '';
      if (esCategoriaComidas(p)) {
        const notaRes = await Swal.fire({
          title: 'Nota para cocina (opcional)',
          input: 'text', inputPlaceholder: 'Ej: sin cebolla, sin queso...', showCancelButton: true,
          didOpen: () => {
            const inp = document.querySelector('.swal2-input');
            if (inp) {
              ['keydown', 'keyup', 'keypress', 'paste', 'copy', 'cut', 'contextmenu'].forEach(evt => {
                inp.addEventListener(evt, e => e.stopPropagation());
              });
            }
          }
        });
        if (!notaRes.isConfirmed) return;
        nota = (notaRes.value || '').trim();
      }
      const unidad = 'UND';
      const precio = p.precio_unidad;
      const body = { producto_id: p.id, cantidad: 1, unidad, precio: Number(precio), nota };
      const resp = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      if (!resp.ok) return Swal.fire({ icon: 'error', title: data.error || 'Error al agregar' });
      currentMesaEstado = 'ocupada';
      await cargarPedido(pedidoActual.id);
      $('#buscarProductoMesa').val('').focus();
    });
  }

  // Enviar todos los items pendientes a cocina
  $('#btnEnviarCocina').on('click', async function () {
    try {
      const pendientes = items.filter(i => i.estado === 'pendiente');
      for (const it of pendientes) {
        await fetch(`/api/mesas/items/${it.id}/enviar`, { method: 'PUT' });
      }
      await cargarPedido(pedidoActual.id);
      Swal.fire({ icon: 'success', title: 'Enviado a cocina' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo enviar a cocina' });
    }
  });

  // Mover pedido a otra mesa (wizard: todo o productos específicos)
  async function handleMoverMesa() {
    if (!pedidoActual || items.length === 0) {
      return Swal.fire({ icon: 'warning', title: 'No hay productos para mover' });
    }

    try {
      // 1. Preguntar qué desea realizar
      const result = await Swal.fire({
        title: 'Mover Pedido',
        text: '¿Qué desea realizar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-grid-fill me-2"></i>Mover toda la mesa',
        denyButtonText: '<i class="bi bi-check-square me-2"></i>Elegir productos',
        showDenyButton: true,
        cancelButtonText: 'Cancelar',
        customClass: {
          confirmButton: 'btn btn-primary',
          denyButton: 'btn btn-info',
          cancelButton: 'btn btn-secondary'
        }
      });

      if (result.isDismissed) return;

      const esParcial = result.isDenied;
      let itemIdsParaMover = [];

      // 2. Si eligió productos específicos, mostrar lista de selección
      if (esParcial) {
        let htmlItems = '<div class="list-group text-start shadow-sm" style="max-height: 350px; overflow-y: auto;">';
        items.forEach(it => {
          htmlItems += `
            <label class="list-group-item list-group-item-action d-flex align-items-center">
              <input class="form-check-input me-3 item-to-move" type="checkbox" value="${it.id}" style="width: 1.5rem; height: 1.5rem;">
              <div class="flex-grow-1">
                <div class="fw-bold">${it.producto_nombre || it.nombre}</div>
                <div class="small text-muted">Cantidad: ${it.cantidad} — ${formatear(it.subtotal)}</div>
              </div>
            </label>`;
        });
        htmlItems += '</div>';

        const { value: selected } = await runWithOffcanvasHidden(async () => {
          return await Swal.fire({
            title: 'Seleccione productos',
            html: htmlItems,
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Atrás',
            preConfirm: () => {
              const checked = Array.from(document.querySelectorAll('.item-to-move:checked')).map(el => el.value);
              if (checked.length === 0) {
                Swal.showValidationMessage('Seleccione al menos un producto');
              }
              return checked;
            }
          });
        });

        if (!selected) return;
        itemIdsParaMover = selected;
      }

      // 3. Obtener mesas y seleccionar destino
      const resp = await fetch('/api/mesas/listar');
      const todasLasMesas = await resp.json();

      // Si muevo TODO, solo mesas libres. Si es PARCIAL, puede ser cualquier mesa excepto la actual.
      let mesasDisponibles;
      if (esParcial) {
        mesasDisponibles = todasLasMesas.filter(m => Number(m.id) !== Number(pedidoActual.mesa_id));
      } else {
        mesasDisponibles = todasLasMesas.filter(m => Number(m.pedidos_abiertos || 0) === 0 && Number(m.id) !== Number(pedidoActual.mesa_id));
      }

      if (mesasDisponibles.length === 0) {
        return Swal.fire({ icon: 'info', title: 'No hay mesas disponibles', text: esParcial ? 'No hay otras mesas creadas.' : 'No hay mesas libres para mover todo el pedido.' });
      }

      const options = mesasDisponibles.reduce((acc, m) => {
        const estadoLabel = m.estado === 'ocupada' ? ' (Ocupada - Se mezclará)' : '';
        acc[m.id] = `Mesa ${m.numero}${m.descripcion ? ' - ' + m.descripcion : ''}${estadoLabel}`;
        return acc;
      }, {});

      const { value: destinoId } = await runWithOffcanvasHidden(async () => {
        return await Swal.fire({
          title: 'Seleccione mesa destino',
          input: 'select',
          inputOptions: options,
          inputPlaceholder: 'Elija la mesa...',
          showCancelButton: true,
          confirmButtonText: 'Confirmar Traslado',
          cancelButtonText: 'Cancelar'
        });
      });

      if (!destinoId) return;

      // 4. Llamar a la API correspondiente
      Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      let endpoint, method, body;
      if (esParcial) {
        endpoint = `/api/mesas/pedidos/${pedidoActual.id}/mover-items`;
        method = 'POST';
        body = JSON.stringify({ itemIds: itemIdsParaMover, mesa_destino_id: Number(destinoId) });
      } else {
        endpoint = `/api/mesas/pedidos/${pedidoActual.id}/mover`;
        method = 'PUT';
        body = JSON.stringify({ mesa_destino_id: Number(destinoId) });
      }

      const r = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const data = await r.json();

      if (!r.ok) throw new Error(data.error || 'No se pudo realizar el traslado');

      await cargarPedido(pedidoActual.id);
      Swal.fire({
        icon: 'success',
        title: '¡Completado!',
        text: esParcial ? 'Productos trasladados correctamente.' : 'Pedido movido exitosamente.',
        timer: 2000
      });

      // Recargar mesas en el grid para ver cambios visuales de inmediato
      if (typeof refreshMesas === 'function') refreshMesas();

    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  }

  $('#btnMoverMesa').on('click', handleMoverMesa);
  $('#btnMoverMesaHeader').on('click', handleMoverMesa);

  // ====== Estado en vivo de mesas (sin recargar) ======
  async function refreshMesas() {
    try {
      const resp = await fetch('/api/mesas/listar');
      const mesas = await resp.json();
      if (!Array.isArray(mesas)) return;
      mesas.forEach(m => {
        const card = document.querySelector(`.mesa-card[data-mesa-id="${m.id}"]`);
        if (!card) return;
        const estadoAnterior = card.dataset.mesaEstado;
        if (estadoAnterior === m.estado) return; // sin cambio, no tocar DOM

        // 1. Actualizar data-attribute
        card.dataset.mesaEstado = m.estado;

        // 2. Clase de color en la card (borde superior)
        card.classList.remove('libre', 'ocupada', 'reservada');
        card.classList.add(m.estado);

        // 3. Pill de estado: clase y texto
        const pill = card.querySelector('.mesa-estado-pill');
        if (pill) {
          pill.classList.remove('pill-libre', 'pill-ocupada', 'pill-reservada');
          pill.classList.add('pill-' + m.estado);
          const texto = m.estado === 'libre' ? 'Libre' : (m.estado === 'ocupada' ? 'Ocupada' : 'Reservada');
          pill.innerHTML = '<i class="bi bi-circle-fill" style="font-size:.5rem;"></i>' + texto;
        }

        // 4. Botón CTA (Abrir pedido / Editar pedido)
        const btnCta = card.querySelector('.btnAbrirPedido');
        if (btnCta) {
          if (m.estado === 'libre') {
            btnCta.className = 'btn btn-success btn-cta btnAbrirPedido';
            btnCta.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Abrir pedido';
          } else {
            btnCta.className = 'btn btn-warning btn-cta btnAbrirPedido';
            btnCta.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar pedido';
          }
        }

        // 5. Botón Liberar: mostrar si ocupada, ocultar si libre
        const btnLiberar = card.querySelector('.btnLiberarMesa');
        if (m.estado === 'libre') {
          if (btnLiberar) btnLiberar.remove();
        } else if (!btnLiberar) {
          const btnVer = card.querySelector('.btnVerPedido');
          if (btnVer) {
            const nuevoBtn = document.createElement('button');
            nuevoBtn.className = 'btn btn-outline-secondary btn-sec flex-fill btnLiberarMesa';
            nuevoBtn.title = 'Liberar mesa';
            nuevoBtn.innerHTML = '<i class="bi bi-unlock me-1"></i>Liberar';
            btnVer.insertAdjacentElement('afterend', nuevoBtn);
          }
        }
      });
    } catch (_) { /* ignorar errores de red */ }
  }

  // refrescar cada 3s
  setInterval(refreshMesas, 3000);
  // primera carga
  refreshMesas();

  // Facturar pedido - Usa cliente predeterminado automáticamente
  $('#btnFacturarPedido').on('click', async function () {
    try {
      if (!pedidoActual || !pedidoActual.id) {
        Swal.fire({ icon: 'error', title: 'No hay pedido activo' });
        return;
      }

      if (items.length === 0) {
        Swal.fire({ icon: 'warning', title: 'El pedido no tiene items' });
        return;
      }

      // Calcular total del pedido con descuentos aplicados (temporales para esta venta) + propina
      let totalPedido = 0;
      items.forEach(it => {
        const cantidad = Number(it.cantidad || 0);
        const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
        const subtotal = subtotalConDescuento(cantidad, precio, it.id);
        totalPedido += subtotal;
      });
      const totalConPropinaFacturar = totalPedido + propinaPedido;

      if (totalPedido <= 0) {
        Swal.fire({ icon: 'warning', title: 'El total del pedido es cero' });
        return;
      }

      // Obtener cliente predeterminado automáticamente
      const cliente = await getOrCreateConsumidorFinal();
      if (!cliente || !cliente.id) {
        Swal.fire({ icon: 'error', title: 'No se pudo obtener el cliente predeterminado' });
        return;
      }

      // Mostrar modal de pago (total incluye propina)
      await mostrarModalPago(totalConPropinaFacturar, cliente.id);
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.message });
    }
  });

  // Función para mostrar modal de pago
  async function mostrarModalPago(total, clienteId) {
    const modal = new bootstrap.Modal(document.getElementById('modalPago'));
    let formaPagoSeleccionada = null;
    let montoRecibido = null;

    // Actualizar total en modal
    $('#modalTotalPago').text(formatear(total));

    // Generar denominaciones según el total
    generarDenominaciones(total);

    // Resetear estado
    $('.payment-card').removeClass('selected');
    $('#panelEfectivo').hide();
    $('#panelTransferencia').hide();
    $('#btnConfirmarPago').prop('disabled', true);
    $('#montoManual').val('');
    $('#infoCambio').hide();

    // Handlers para seleccionar tipo de pago
    $('.payment-card').off('click').on('click', function () {
      $('.payment-card').removeClass('selected');
      $(this).addClass('selected');
      formaPagoSeleccionada = $(this).data('payment-type');

      if (formaPagoSeleccionada === 'efectivo') {
        $('#panelEfectivo').slideDown();
        $('#panelTransferencia').slideUp();
        $('#btnConfirmarPago').prop('disabled', true);
      } else {
        $('#panelTransferencia').slideDown();
        $('#panelEfectivo').slideUp();
        $('#btnConfirmarPago').prop('disabled', false);
        montoRecibido = total; // Transferencia siempre es el total exacto
      }
    });

    // Handler para denominaciones
    $('.denominacion-btn').off('click').on('click', function () {
      $('.denominacion-btn').removeClass('selected');
      $(this).addClass('selected');
      montoRecibido = parseFloat($(this).data('valor'));
      $('#montoManual').val(montoRecibido);
      calcularCambio(total, montoRecibido);
      $('#btnConfirmarPago').prop('disabled', false);
    });

    // Handler para monto manual
    function usarMontoManual() {
      const valor = parseFloat($('#montoManual').val()) || 0;
      if (valor < total) {
        Swal.fire({ icon: 'warning', title: 'El monto debe ser mayor o igual al total' });
        return;
      }
      montoRecibido = valor;
      $('.denominacion-btn').removeClass('selected');
      calcularCambio(total, valor);
      $('#btnConfirmarPago').prop('disabled', false);
    }

    $('#montoManual').off('input keypress').on('input', function () {
      const valor = parseFloat($(this).val()) || 0;
      if (valor > 0) {
        $('.denominacion-btn').removeClass('selected');
        if (valor >= total) {
          calcularCambio(total, valor);
          montoRecibido = valor;
          $('#btnConfirmarPago').prop('disabled', false);
        } else {
          $('#infoCambio').hide();
          $('#btnConfirmarPago').prop('disabled', true);
        }
      } else {
        $('#infoCambio').hide();
        $('#btnConfirmarPago').prop('disabled', true);
      }
    }).on('keypress', function (e) {
      if (e.which === 13) { // Enter
        e.preventDefault();
        usarMontoManual();
      }
    });

    $('#btnUsarMontoManual').off('click').on('click', usarMontoManual);

    // Handler para confirmar pago
    $('#btnConfirmarPago').off('click').on('click', async function () {
      if (!formaPagoSeleccionada) {
        Swal.fire({ icon: 'warning', title: 'Seleccione una forma de pago' });
        return;
      }

      if (formaPagoSeleccionada === 'efectivo' && (!montoRecibido || montoRecibido < total)) {
        Swal.fire({ icon: 'warning', title: 'El monto recibido debe ser mayor o igual al total' });
        return;
      }

      // Cerrar modal
      modal.hide();

      // Mostrar loading
      Swal.fire({
        title: 'Generando factura...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const resp = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/facturar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: clienteId,
            forma_pago: formaPagoSeleccionada,
            descuentos: descuentosPorItem,
            propina: propinaPedido
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Error al facturar');

        // Cerrar loading inmediatamente
        Swal.close();

        // Cerrar modal de pago y offcanvas de pedido; no abrir barra lateral de factura (evitar carga que se queda pegada)
        const modalPago = bootstrap.Modal.getInstance(document.getElementById('modalPago'));
        if (modalPago) modalPago.hide();
        canvas.hide();

        // Cerrar también el offcanvas de factura si estuviera abierto
        const facturaCanvasEl = document.getElementById('canvasFactura');
        if (facturaCanvasEl && facturaCanvasEl.classList.contains('show')) {
          const facturaCanvas = bootstrap.Offcanvas.getInstance(facturaCanvasEl);
          if (facturaCanvas) facturaCanvas.hide();
        }

        pedidoActual = null;
        items = [];
        propinaPedido = 0;
        renderItems();

        // Mensaje de éxito y quedarse en mesas
        let html = '<p><strong>Factura #' + (data.numero != null ? data.numero : data.factura_id) + '</strong> generada correctamente.</p>';
        if (formaPagoSeleccionada === 'efectivo' && montoRecibido > total) {
          const cambio = montoRecibido - total;
          html += '<div class="text-start mt-2"><p><strong>Total:</strong> ' + formatear(total) + '</p><p><strong>Recibido:</strong> ' + formatear(montoRecibido) + '</p><p class="text-success fw-bold">Cambio: ' + formatear(cambio) + '</p></div>';
        }
        Swal.fire({
          icon: 'success',
          title: 'Listo',
          html: html,
          confirmButtonText: 'Cerrar'
        });
      } catch (err) {
        Swal.fire({ icon: 'error', title: err.message });
      }
    });

    modal.show();
  }

  // Función para generar denominaciones según el total
  function generarDenominaciones(total) {
    const denominaciones = [10000, 20000, 50000, 100000, 200000, 500000];
    const container = $('#denominacionesContainer');
    container.empty();

    // Filtrar denominaciones que sean mayores o iguales al total
    const disponibles = denominaciones.filter(d => d >= total);

    if (disponibles.length === 0) {
      // Si el total es muy grande, mostrar solo la más grande
      container.html(`
        <div class="col-12">
          <button class="btn denominacion-btn w-100" data-valor="${denominaciones[denominaciones.length - 1]}">
            $${denominaciones[denominaciones.length - 1].toLocaleString('es-CO')}
          </button>
        </div>
      `);
    } else {
      disponibles.forEach(denom => {
        container.append(`
          <div class="col-6 col-md-4">
            <button class="btn denominacion-btn w-100" data-valor="${denom}">
              $${denom.toLocaleString('es-CO')}
            </button>
          </div>
        `);
      });
    }
  }

  // Función para calcular cambio
  function calcularCambio(total, recibido) {
    if (recibido < total) {
      $('#infoCambio').hide();
      return;
    }
    const cambio = recibido - total;
    $('#montoCambio').text(formatear(cambio));
    $('#montoRecibido').text(formatear(recibido));
    $('#infoCambio').slideDown();
  }

  // Función para mostrar factura en sidebar (optimizada para carga inmediata)
  // Hacerla global para poder llamarla desde onclick
  window.mostrarFacturaEnSidebar = async function mostrarFacturaEnSidebar(facturaId, infoPago = null) {
    const facturaCanvas = new bootstrap.Offcanvas(document.getElementById('canvasFactura'));
    const facturaFrame = document.getElementById('facturaFrame');
    const facturaLoading = document.getElementById('facturaLoading');
    const facturaNumero = document.getElementById('facturaNumero');

    // Mostrar sidebar INMEDIATAMENTE (antes de cargar el iframe)
    facturaCanvas.show();

    // Mostrar loading
    facturaLoading.style.display = 'flex';

    // Actualizar número de factura
    facturaNumero.textContent = `#${facturaId}`;

    // Si hay información de pago, mostrarla en el header
    if (infoPago && infoPago.formaPago === 'efectivo' && infoPago.recibido > infoPago.total) {
      const cambio = infoPago.recibido - infoPago.total;
      // Puedes agregar un badge o texto adicional aquí si quieres
    }

    try {
      const urlFactura = `/api/facturas/${facturaId}/imprimir`;
      const TIMEOUT_MS = 15000; // 15 segundos máximo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(urlFactura, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'text/html' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en respuesta:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      if (!html || html.length === 0) {
        throw new Error('La factura está vacía');
      }

      // Crear un blob URL para el iframe
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      console.log('Blob URL creado, cargando en iframe...');

      // Cargar en iframe
      facturaFrame.src = blobUrl;

      function ocultarLoading() {
        if (facturaLoading) facturaLoading.style.display = 'none';
      }
      facturaFrame.onload = ocultarLoading;
      // Fallback: ocultar loading siempre tras 800ms (por si onload no dispara con blob en algunos navegadores)
      setTimeout(ocultarLoading, 800);
      // Doble fallback a 2s por si hay demora en render del iframe
      setTimeout(ocultarLoading, 2000);

      // Manejar errores de carga del iframe
      facturaFrame.onerror = function (e) {
        console.error('Error en iframe:', e);
        facturaLoading.innerHTML = `
          <div class="text-center text-danger">
            <i class="bi bi-exclamation-triangle display-4 d-block mb-2"></i>
            <div>Error al cargar la factura</div>
            <button class="btn btn-primary mt-3" onclick="window.mostrarFacturaEnSidebar(${facturaId})">Reintentar</button>
          </div>
        `;
        URL.revokeObjectURL(blobUrl);
      };

    } catch (error) {
      console.error('Error al cargar factura:', error);
      const esTimeout = (error && error.name === 'AbortError') || (error.message && error.message.includes('abort'));
      const mensaje = esTimeout
        ? 'Tiempo agotado. El servidor no respondió a tiempo. Compruebe la conexión e intente de nuevo.'
        : (error.message || 'Error al cargar la factura');
      facturaLoading.style.display = 'flex';
      facturaLoading.innerHTML = `
        <div class="text-center text-danger">
          <i class="bi bi-exclamation-triangle display-4 d-block mb-2"></i>
          <div>Error al cargar la factura</div>
          <p class="small text-muted">${mensaje}</p>
          <button class="btn btn-primary mt-3" onclick="window.mostrarFacturaEnSidebar(${facturaId})">Reintentar</button>
        </div>
      `;
    }

    // Handler para imprimir
    $('#btnImprimirFactura').off('click').on('click', function () {
      if (facturaFrame.contentWindow) {
        try {
          facturaFrame.contentWindow.print();
        } catch (e) {
          console.error('Error al imprimir:', e);
          Swal.fire({
            icon: 'warning',
            title: 'No se pudo abrir la impresión',
            text: 'Por favor, intente cerrar y abrir la factura nuevamente'
          });
        }
      }
    });

    // Cuando se cierra el sidebar, limpiar iframe para liberar memoria
    $('#canvasFactura').off('hidden.bs.offcanvas').on('hidden.bs.offcanvas', function () {
      if (facturaFrame.src && facturaFrame.src.startsWith('blob:')) {
        URL.revokeObjectURL(facturaFrame.src);
      }
      facturaFrame.src = 'about:blank';
      facturaNumero.textContent = '';
      facturaLoading.style.display = 'flex';
      facturaLoading.innerHTML = `
        <div class="text-center">
          <div class="spinner-border text-primary mb-2" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <div>Cargando factura...</div>
        </div>
      `;
      facturaFrame.onload = null; // Limpiar handler
    });
  }

  // Ocultar temporalmente el panel lateral (offcanvas) durante modales para evitar bloquear copiar/pegar
  async function runWithOffcanvasHidden(action) {
    const el = document.getElementById('canvasPedido');
    const wasOpen = el && el.classList.contains('show');
    if (wasOpen) {
      try { canvas.hide(); } catch (_) {/* noop */ }
      // esperar a que termine animación
      await new Promise(r => setTimeout(r, 250));
    }
    try {
      const result = await action();
      return result;
    } finally {
      if (wasOpen) {
        try { canvas.show(); } catch (_) {/* noop */ }
      }
    }
  }

  function buildPedidoResumenHtml() {
    let total = 0;
    const rows = (items || []).map(it => {
      const cantidad = Number(it.cantidad || 0);
      const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
      const subtotal = Number(it.subtotal != null ? it.subtotal : (cantidad * precio));
      total += subtotal;
      const nombre = it.producto_nombre || it.nombre || '';
      return `<tr><td>${nombre}</td><td class="text-end">${cantidad}</td><td class="text-end">$${subtotal.toLocaleString('es-CO')}</td></tr>`;
    }).join('');
    return `
      <div class="border rounded p-2 mt-2" id="contenedorResumen" style="display:none;max-height:220px;overflow:auto;">
        <table class="table table-sm mb-2">
          <thead class="table-light"><tr><th>Producto</th><th class="text-end">Cant</th><th class="text-end">Subt</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="table-light"><tr><th colspan="2" class="text-end">Total</th><th class="text-end">$${total.toLocaleString('es-CO')}</th></tr></tfoot>
        </table>
      </div>`;
  }

  // -- Helpers de cliente: búsqueda por nombre con default "Consumidor final" --
  async function getOrCreateConsumidorFinal() {
    // Buscar por nombre
    try {
      const r = await fetch('/api/clientes/buscar?q=consumidor%20final');
      const list = await r.json();
      const cf = list.find(c => (c.nombre || '').toLowerCase() === 'consumidor final');
      if (cf) return cf;
    } catch (_) {/* noop */ }
    // Crear si no existe
    try {
      const r = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Consumidor final' }) });
      if (r.ok) { const cf = await r.json(); return { id: cf.id, nombre: 'Consumidor final' }; }
    } catch (_) {/* noop */ }
    // Último recurso: retornar marcador para evitar bloqueo
    return { id: null, nombre: 'Consumidor final' };
  }

  async function buscarClientesPorNombre(q) {
    const resp = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(q)}`);
    if (!resp.ok) return [];
    return await resp.json();
  }

  async function seleccionarClienteConBusqueda() {
    const defaultCliente = await getOrCreateConsumidorFinal();
    let seleccionado = defaultCliente;
    // Bucle para permitir crear cliente y luego usarlo
    // Confirm = Usar cliente; Deny = Crear cliente; Cancel = cancelar flujo
    // Tras crear, retornamos el nuevo cliente directamente
    // Diseño con buscador y lista, y default Consumidor final
    /* eslint no-constant-condition: 0 */
    while (true) {
      const result = await Swal.fire({
        title: 'Seleccionar cliente',
        html: `
          <div class="mb-2 text-start small text-muted">Predeterminado: <strong id="cfNombre">${seleccionado.nombre}</strong></div>
          <div class="input-group mb-2">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input id="buscarClienteMesa" class="form-control" placeholder="Buscar cliente por nombre o teléfono..." />
          </div>
          <div id="resultadosClientesMesa" class="list-group" style="max-height:260px;overflow:auto"></div>
          <button id="btnToggleResumen" class="btn btn-outline-secondary btn-sm mt-2" type="button"><i class="bi bi-receipt"></i> Ver pedido</button>
          ${buildPedidoResumenHtml()}
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Usar cliente',
        denyButtonText: 'Crear cliente',
        didOpen: async () => {
          const $input = document.getElementById('buscarClienteMesa');
          const $list = document.getElementById('resultadosClientesMesa');
          // Permitir copiar/pegar sin interferencia de atajos globales
          const allowClipboard = (el) => {
            ['keydown', 'keyup', 'keypress', 'paste', 'copy', 'cut', 'contextmenu'].forEach(evt => {
              el.addEventListener(evt, (e) => {
                e.stopPropagation(); // no afectar por manejadores globales
              });
            });
          };
          allowClipboard($input);
          // Prefill lista con Consumidor final
          $list.innerHTML = '';
          const li = document.createElement('a');
          li.href = '#'; li.className = 'list-group-item list-group-item-action active';
          li.textContent = `${seleccionado.nombre} (predeterminado)`;
          li.onclick = (e) => { e.preventDefault(); marcarSeleccion(li, seleccionado); };
          $list.appendChild(li);

          // Toggle resumen
          const btnRes = document.getElementById('btnToggleResumen');
          const contRes = document.getElementById('contenedorResumen');
          if (btnRes && contRes) {
            btnRes.addEventListener('click', () => {
              const visible = contRes.style.display !== 'none';
              contRes.style.display = visible ? 'none' : 'block';
              btnRes.classList.toggle('active', !visible);
              btnRes.innerHTML = !visible ? '<i class="bi bi-receipt"></i> Ocultar pedido' : '<i class="bi bi-receipt"></i> Ver pedido';
            });
          }

          let to;
          function marcarSeleccion(el, cliente) {
            seleccionado = cliente;
            document.querySelectorAll('#resultadosClientesMesa .list-group-item').forEach(x => x.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('cfNombre').textContent = cliente.nombre;
          }
          async function doSearch() {
            const q = ($input.value || '').trim();
            if (q.length < 2) { return; }
            const res = await buscarClientesPorNombre(q);
            $list.innerHTML = '';
            if (res.length === 0) {
              const empty = document.createElement('div');
              empty.className = 'list-group-item text-muted';
              empty.textContent = 'Sin resultados';
              $list.appendChild(empty);
              return;
            }
            res.forEach(c => {
              const a = document.createElement('a');
              a.href = '#'; a.className = 'list-group-item list-group-item-action';
              a.innerHTML = `<div><strong>${c.nombre}</strong></div><div class="small text-muted">${c.telefono || ''} ${c.direccion ? '• ' + c.direccion : ''}</div>`;
              a.onclick = (e) => { e.preventDefault(); marcarSeleccion(a, c); };
              $list.appendChild(a);
            });
          }
          $input.addEventListener('input', () => { clearTimeout(to); to = setTimeout(doSearch, 250); });
        }
      });

      if (result.isDenied) {
        // Crear cliente nuevo
        const nuevo = await Swal.fire({
          title: 'Nuevo cliente',
          html: `
            <div class="text-start">
              <div class="mb-2">
                <label class="form-label small">Nombre</label>
                <input id="nuevoCliNombre" class="form-control" placeholder="Nombre del cliente" />
              </div>
              <div class="mb-2">
                <label class="form-label small">Teléfono (opcional)</label>
                <input id="nuevoCliTel" class="form-control" placeholder="Teléfono" />
              </div>
              <div class="mb-2">
                <label class="form-label small">Dirección (opcional)</label>
                <input id="nuevoCliDir" class="form-control" placeholder="Dirección" />
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Guardar',
          didOpen: () => {
            // Permitir copiar/pegar en todos los inputs del modal
            ['nuevoCliNombre', 'nuevoCliTel', 'nuevoCliDir'].forEach(id => {
              const el = document.getElementById(id);
              if (!el) return;
              ['keydown', 'keyup', 'keypress', 'paste', 'copy', 'cut', 'contextmenu'].forEach(evt => {
                el.addEventListener(evt, (e) => {
                  e.stopPropagation();
                });
              });
            });
          },
          preConfirm: () => {
            const nombre = (document.getElementById('nuevoCliNombre').value || '').trim();
            const telefono = (document.getElementById('nuevoCliTel').value || '').trim();
            const direccion = (document.getElementById('nuevoCliDir').value || '').trim();
            if (!nombre) {
              Swal.showValidationMessage('El nombre es requerido');
              return false;
            }
            return { nombre, telefono, direccion };
          }
        });
        if (nuevo.isConfirmed) {
          const body = nuevo.value;
          try {
            const resp = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!resp.ok) {
              const e = await resp.json();
              throw new Error(e.error || 'Error al crear cliente');
            }
            const data = await resp.json();
            const creado = { id: data.id, nombre: body.nombre, telefono: body.telefono, direccion: body.direccion };
            await Swal.fire({ icon: 'success', title: 'Cliente creado' });
            return creado;
          } catch (err) {
            await Swal.fire({ icon: 'error', title: err.message || 'Error al crear cliente' });
            continue; // volver al selector
          }
        } else {
          continue; // volver al selector
        }
      }

      if (result.isConfirmed) {
        return seleccionado;
      }
      // Cancelado
      return null;
    }
  }

  // Clicks en tarjetas de mesa
  let currentMesaEstado = null;
  $('#gridMesas').on('click', '.btnAbrirPedido', function () {
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const titulo = card.find('.card-title').text().replace('Mesa ', '');
    currentMesaEstado = card.data('mesa-estado') || 'libre';
    abrirPedido(mesaId, titulo);
  });

  // Liberar mesa desde tarjeta
  $('#gridMesas').on('click', '.btnLiberarMesa', async function () {
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const mesaNum = card.find('.card-title').text().replace('Mesa ', '');
    const ok = await Swal.fire({ title: `Liberar mesa ${mesaNum}?`, text: 'Solo si no tiene items activos', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, liberar' });
    if (!ok.isConfirmed) return;
    try {
      const r = await fetch(`/api/mesas/${mesaId}/liberar`, { method: 'PUT' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo liberar');
      Swal.fire({ icon: 'success', title: 'Mesa liberada' }).then(() => location.reload());
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.message });
    }
  });

  // Liberar desde header del offcanvas
  $('#btnLiberarMesaHeader').on('click', async function () {
    const ok = await Swal.fire({ title: `Liberar mesa ${$('#pedidoMesa').text()}?`, text: 'Solo si no tiene items activos', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, liberar' });
    if (!ok.isConfirmed) return;
    try {
      const r = await fetch(`/api/mesas/${pedidoActual.mesa_id}/liberar`, { method: 'PUT' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo liberar');
      Swal.fire({ icon: 'success', title: 'Mesa liberada' }).then(() => location.reload());
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.message });
    }
  });

  // Ver pedido: reutiliza abrirPedido (recupera si existe, o crea si no)
  $('#gridMesas').on('click', '.btnVerPedido', function () {
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const titulo = card.find('.card-title').text().replace('Mesa ', '');
    currentMesaEstado = card.data('mesa-estado') || 'libre';
    abrirPedido(mesaId, titulo);
  });

  // Editar mesa (número y descripción)
  $('#gridMesas').on('click', '.btnEditarMesa', async function () {
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const numeroActual = $(this).data('mesa-numero');
    const descActual = $(this).data('mesa-descripcion') || '';
    const { value: form } = await Swal.fire({
      title: 'Editar mesa',
      html: `
        <div class="text-start">
          <label class="form-label small">Número</label>
          <input id="editMesaNumero" class="form-control mb-2" value="${(numeroActual || '').toString().replace(/"/g, '&quot;')}" />
          <label class="form-label small">Descripción</label>
          <input id="editMesaDesc" class="form-control" value="${(descActual || '').toString().replace(/"/g, '&quot;')}" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      preConfirm: () => {
        const num = (document.getElementById('editMesaNumero').value || '').trim();
        const desc = (document.getElementById('editMesaDesc').value || '').trim();
        if (!num) { Swal.showValidationMessage('El número es obligatorio'); return false; }
        if (!desc) { Swal.showValidationMessage('La descripción es obligatoria'); return false; }
        return { numero: num, descripcion: desc };
      }
    });
    if (!form) return;
    try {
      const r = await fetch(`/api/mesas/${mesaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al actualizar');
      Swal.fire({ icon: 'success', title: 'Mesa actualizada' }).then(() => location.reload());
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.message });
    }
  });

  // Crear nueva mesa (rápida) - descripción obligatoria
  $('#btnNuevaMesa').on('click', async function () {
    const { value: numero } = await Swal.fire({ title: 'Número de mesa', input: 'text', showCancelButton: true, inputValidator: v => !v?.trim() ? 'El número es obligatorio' : null });
    if (!numero) return;
    const { value: descripcion } = await Swal.fire({ title: 'Descripción (ubicación o nombre)', input: 'text', showCancelButton: true, inputValidator: v => !v?.trim() ? 'La descripción es obligatoria (ej: Terraza, Interior)' : null });
    if (!descripcion) return;
    const resp = await fetch('/api/mesas/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero, descripcion: descripcion.trim() }) });
    if (!resp.ok) { const err = await resp.json(); return Swal.fire({ icon: 'error', title: err.error || 'Error' }); }
    Swal.fire({ icon: 'success', title: 'Mesa creada' }).then(() => location.reload());
  });
});


