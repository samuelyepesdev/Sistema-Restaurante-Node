// Billing and single payment modals for Mesas module

$(function () {
  const mod = window.MesasModule;

  async function getOrCreateConsumidorFinal() {
    try {
      const r = await fetch('/api/clientes/buscar?q=consumidor%20final');
      const list = await r.json();
      const cf = list.find(c => (c.nombre || '').toLowerCase() === 'consumidor final');
      if (cf) return cf;
    } catch (_) {}
    try {
      const r = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Consumidor final' }) });
      if (r.ok) { const cf = await r.json(); return { id: cf.id, nombre: 'Consumidor final' }; }
    } catch (_) {}
    return { id: null, nombre: 'Consumidor final' };
  }

  $('#btnFacturarPedido').on('click', async function () {
    try {
      if (!mod.pedidoActual || !mod.pedidoActual.id) {
        Swal.fire({ icon: 'error', title: 'No hay pedido activo' });
        return;
      }

      if (mod.items.length === 0) {
        Swal.fire({ icon: 'warning', title: 'El pedido no tiene items' });
        return;
      }

      let totalPedido = 0;
      let checkPendientes = false;

      mod.items.forEach(it => {
        if (!it.pagado) {
          const cantidad = Number(it.cantidad || 0);
          const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
          const subtotal = mod.subtotalConDescuento(cantidad, precio, it.id);
          totalPedido += subtotal;
          checkPendientes = true;
        }
      });
      const totalConPropinaFacturar = totalPedido + mod.propinaPedido;

      let clienteIdFacturar = mod.clienteActual.id;
      if (!clienteIdFacturar) {
        const clienteDefault = await getOrCreateConsumidorFinal();
        if (!clienteDefault || !clienteDefault.id) {
          Swal.fire({ icon: 'error', title: 'No se pudo obtener el cliente predeterminado' });
          return;
        }
        clienteIdFacturar = clienteDefault.id;
      }

      if (!checkPendientes && totalConPropinaFacturar <= 0) {
        try {
          const reqFactura = await fetch(`/api/mesas/pedidos/${mod.pedidoActual.id}/facturar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cliente_id: clienteIdFacturar,
              forma_pago: 'efectivo',
              descuentos: mod.descuentosPorItem,
              propina: mod.propinaPedido
            })
          });
          const dataF = await reqFactura.json();
          if (!reqFactura.ok) throw new Error(dataF.error || 'Error al facturar');
          
          Swal.fire({
            icon: 'success',
            title: 'Listo',
            html: '<p><strong>Factura #' + (dataF.numero != null ? dataF.numero : dataF.factura_id) + '</strong> generada correctamente.</p>',
            confirmButtonText: 'Cerrar'
          }).then(() => {
             mod.canvas.hide();
             if (typeof refreshMesas === 'function') refreshMesas();
          });
        } catch(errF) {
          Swal.fire({ icon: 'error', title: errF.message });
        }
        return;
      }

      if (checkPendientes && totalConPropinaFacturar <= 0) {
        try {
          const reqFactura = await fetch(`/api/mesas/pedidos/${mod.pedidoActual.id}/facturar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cliente_id: clienteIdFacturar,
              forma_pago: 'efectivo',
              descuentos: mod.descuentosPorItem,
              propina: mod.propinaPedido
            })
          });
          const dataF = await reqFactura.json();
          if (!reqFactura.ok) throw new Error(dataF.error || 'Error al facturar');
          
          Swal.fire({
            icon: 'success',
            title: 'Listo',
            html: '<p><strong>Factura #' + (dataF.numero != null ? dataF.numero : dataF.factura_id) + '</strong> generada (sin costo).</p>',
            confirmButtonText: 'Cerrar'
          }).then(() => {
             mod.canvas.hide();
             if (typeof refreshMesas === 'function') refreshMesas();
          });
        } catch(errF) {
          Swal.fire({ icon: 'error', title: errF.message });
        }
        return;
      }

      if (checkPendientes) {
        const result = await Swal.fire({
          title: 'Opciones de Facturación',
          text: '¿Cómo desea facturar?',
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: 'Mesa Completa',
          denyButtonText: 'Por Producto',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#198754',
          denyButtonColor: '#0d6efd'
        });

        if (result.isConfirmed) {
          await mostrarModalPago(totalConPropinaFacturar, clienteIdFacturar);
        } else if (result.isDenied) {
          await mod.runWithOffcanvasHidden(async () => {
            const inputOptions = {};
            mod.items.forEach(it => {
              if (!it.pagado) {
                const cantidad = Number(it.cantidad || 0);
                const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
                const subtotal = mod.subtotalConDescuento(cantidad, precio, it.id);
                inputOptions[it.id] = (it.producto_nombre || it.nombre || it.producto_id) + ' - ' + mod.formatear(subtotal);
              }
            });
            const { value: itemId } = await Swal.fire({
              title: '<h4 class="mb-0 fw-bold text-primary"><i class="bi bi-cart-check me-2"></i>Seleccione el producto</h4>',
              html: '<p class="text-muted small">Seleccione cuál de los ítems pendientes desea pagar individualmente:</p>',
              input: 'radio',
              inputOptions: inputOptions,
              inputValidator: (value) => { if (!value) return 'Debe elegir un producto'; },
              showCancelButton: true,
              confirmButtonText: 'Continuar <i class="bi bi-arrow-right-short"></i>',
              cancelButtonText: 'Cancelar',
              confirmButtonColor: '#0d6efd',
              cancelButtonColor: '#6c757d'
            });

            if (itemId) {
              const selectedItem = mod.items.find(it => String(it.id) === String(itemId));
              let cantidadAPagar = parseFloat(selectedItem ? selectedItem.cantidad : 1);

              if (cantidadAPagar > 1) {
                const { value: cant } = await Swal.fire({
                  title: '<h4 class="mb-0 fw-bold text-success"><i class="bi bi-calculator me-2"></i>Cantidad a pagar</h4>',
                  html: `<p class="mb-2">Este producto tiene <strong>${cantidadAPagar}</strong> unidades.</p><p class="text-muted small">¿Cuántas unidades vas a pagar ahora?</p>`,
                  input: 'number',
                  inputValue: 1,
                  inputAttributes: { min: 1, max: cantidadAPagar, step: 1 },
                  inputValidator: (value) => {
                    if (!value || parseFloat(value) <= 0) return 'Debe ingresar una cantidad válida';
                    if (parseFloat(value) > cantidadAPagar) return `No puede pagar más de ${cantidadAPagar} unidades`;
                  },
                  showCancelButton: true,
                  confirmButtonText: 'Siguiente <i class="bi bi-arrow-right-short"></i>',
                  cancelButtonText: 'Cancelar',
                  confirmButtonColor: '#198754',
                  cancelButtonColor: '#6c757d'
                });
                if (!cant) return;
                cantidadAPagar = parseFloat(cant);
              }

              const inputPagoOptions = { 'efectivo': 'Efectivo', 'transferencia': 'Transferencia' };
              const { value: formaPago } = await Swal.fire({
                title: '<h4 class="mb-0 fw-bold text-primary"><i class="bi bi-cash-stack me-2"></i>Pagar Item Individual</h4>',
                html: '<p class="text-muted small">Seleccione el método de pago para este ítem:</p>',
                input: 'radio',
                inputOptions: inputPagoOptions,
                inputValidator: (value) => { if (!value) return 'Debe elegir un método'; },
                showCancelButton: true,
                confirmButtonText: 'Siguiente <i class="bi bi-arrow-right-short"></i>',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#0d6efd',
                cancelButtonColor: '#6c757d'
              });
              if (formaPago) {
                let montoRecibido = 0;
                let cambioADevolver = 0;
                
                const precioUnitario = Number((selectedItem.precio_unitario != null ? selectedItem.precio_unitario : selectedItem.precio) || 0);
                const subtotalAPagar = mod.subtotalConDescuento(cantidadAPagar, precioUnitario, selectedItem.id);

                if (formaPago === 'efectivo') {
                  const { value: recibido } = await Swal.fire({
                    title: '<h4 class="mb-0 fw-bold text-success"><i class="bi bi-wallet2 me-2"></i>Pago en Efectivo</h4>',
                    html: `<p class="mb-1">Total a pagar: <strong class="fs-4 text-success">${mod.formatear(subtotalAPagar)}</strong></p><p class="text-muted small">Ingrese el monto recibido:</p>`,
                    input: 'number',
                    inputAttributes: { min: subtotalAPagar, step: 100 },
                    inputValidator: (value) => {
                      if (!value || parseFloat(value) < subtotalAPagar) return `El monto recibido debe ser mayor o igual a ${mod.formatear(subtotalAPagar)}`;
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Confirmar Pago <i class="bi bi-check-circle"></i>',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#198754',
                    cancelButtonColor: '#6c757d'
                  });
                  if (!recibido) return;
                  montoRecibido = parseFloat(recibido);
                  cambioADevolver = montoRecibido - subtotalAPagar;
                }

                try {
                  const r = await fetch(`/api/mesas/items/${itemId}/pagar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ forma_pago: formaPago, cantidad: cantidadAPagar })
                  });
                  if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Error al pagar item'); }
                  await mod.cargarPedido(mod.pedidoActual.id);
                  
                  let htmlMsg = `Producto pagado correctamente.`;
                  if (formaPago === 'efectivo' && montoRecibido > subtotalAPagar) {
                    htmlMsg += `<br><br><strong class="text-success" style="font-size:1.15rem;">Cambio a devolver: ${mod.formatear(cambioADevolver)}</strong>`;
                  }
                  Swal.fire({ icon: 'success', title: 'Completado', html: htmlMsg, confirmButtonText: 'OK', confirmButtonColor: '#198754' });
                } catch(e) { Swal.fire({ icon: 'error', title: e.message }); }
              }
            }
          });
        }
      } else {
        await mostrarModalPago(totalConPropinaFacturar, clienteIdFacturar);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.message });
    }
  });

  async function mostrarModalPago(total, clienteId) {
    const modal = new bootstrap.Modal(document.getElementById('modalPago'));
    let formaPagoSeleccionada = null;
    let montoRecibido = null;

    $('#modalTotalPago').text(mod.formatear(total));
    generarDenominaciones(total);

    $('.payment-card').removeClass('selected');
    $('#panelEfectivo').hide();
    $('#panelTransferencia').hide();
    $('#btnConfirmarPago').prop('disabled', true);
    $('#montoManual').val('');
    $('#infoCambio').hide();

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
        montoRecibido = total;
      }
    });

    $('.denominacion-btn').off('click').on('click', function () {
      $('.denominacion-btn').removeClass('selected');
      $(this).addClass('selected');
      montoRecibido = parseFloat($(this).data('valor'));
      $('#montoManual').val(montoRecibido);
      calcularCambio(total, montoRecibido);
      $('#btnConfirmarPago').prop('disabled', false);
    });

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
      if (e.which === 13) {
        e.preventDefault();
        usarMontoManual();
      }
    });

    $('#btnUsarMontoManual').off('click').on('click', usarMontoManual);

    $('#btnConfirmarPago').off('click').on('click', async function () {
      if (!formaPagoSeleccionada) {
        Swal.fire({ icon: 'warning', title: 'Seleccione una forma de pago' });
        return;
      }
      if (formaPagoSeleccionada === 'efectivo' && (!montoRecibido || montoRecibido < total)) {
        Swal.fire({ icon: 'warning', title: 'El monto recibido debe ser mayor o igual al total' });
        return;
      }

      modal.hide();

      Swal.fire({
        title: 'Generando factura...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const resp = await fetch(`/api/mesas/pedidos/${mod.pedidoActual.id}/facturar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: clienteId,
            forma_pago: formaPagoSeleccionada,
            descuentos: mod.descuentosPorItem,
            propina: mod.propinaPedido
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Error al facturar');

        Swal.close();
        const modalPago = bootstrap.Modal.getInstance(document.getElementById('modalPago'));
        if (modalPago) modalPago.hide();
        mod.canvas.hide();

        const facturaCanvasEl = document.getElementById('canvasFactura');
        if (facturaCanvasEl && facturaCanvasEl.classList.contains('show')) {
          const facturaCanvas = bootstrap.Offcanvas.getInstance(facturaCanvasEl);
          if (facturaCanvas) facturaCanvas.hide();
        }

        mod.pedidoActual = null;
        mod.items = [];
        mod.propinaPedido = 0;
        mod.renderItems();

        let html = '<p><strong>Factura #' + (data.numero != null ? data.numero : data.factura_id) + '</strong> generada correctamente.</p>';
        if (formaPagoSeleccionada === 'efectivo' && montoRecibido > total) {
          const cambio = montoRecibido - total;
          html += '<div class="text-start mt-2"><p><strong>Total:</strong> ' + mod.formatear(total) + '</p><p><strong>Recibido:</strong> ' + mod.formatear(montoRecibido) + '</p><p class="text-success fw-bold">Cambio: ' + mod.formatear(cambio) + '</p></div>';
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

  function generarDenominaciones(total) {
    const denominaciones = [10000, 20000, 50000, 100000, 200000, 500000];
    const container = $('#denominacionesContainer');
    container.empty();

    const disponibles = denominaciones.filter(d => d >= total);
    if (disponibles.length === 0) {
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

  function calcularCambio(total, recibido) {
    if (recibido < total) {
      $('#infoCambio').hide();
      return;
    }
    const cambio = recibido - total;
    $('#montoCambio').text(mod.formatear(cambio));
    $('#montoRecibido').text(mod.formatear(recibido));
    $('#infoCambio').slideDown();
  }
});
