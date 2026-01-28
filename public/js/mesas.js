// JS de Mesas: UI para abrir/gestionar pedidos por mesa y enviar a cocina
// Relacionado con: views/mesas.ejs, routes/mesas.js, routes/productos.js, routes/facturas.js

$(function() {
  const canvas = new bootstrap.Offcanvas('#canvasPedido');
  let pedidoActual = null; // { id, mesa_id }
  let items = []; // items del pedido en UI

  // Helpers UI
  function formatear(valor){return `$${Number(valor||0).toLocaleString('es-CO')}`}
  function renderItems(){
    const tbody = $('#tbodyItems');
    tbody.empty();
    let total = 0;
    items.forEach((it, idx) => {
      const cantidad = Number(it.cantidad || 0);
      const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
      const subtotal = Number(it.subtotal != null ? it.subtotal : (cantidad * precio));
      total += subtotal;
      tbody.append(`
        <tr>
          <td>${it.producto_nombre || it.nombre || it.producto_id}</td>
          <td class="text-end">${cantidad}</td>
          <td class="text-end">${formatear(precio)}</td>
          <td class="text-end d-flex align-items-center justify-content-end gap-1">
            <button class="btn btn-sm btn-outline-secondary btn-menos-item" data-item-id="${it.id}" data-cantidad="${cantidad}" title="Quitar cantidad"><i class="bi bi-dash"></i></button>
            <span>${formatear(subtotal)}</span>
            <button class="btn btn-sm btn-outline-secondary btn-mas-item" data-item-id="${it.id}" data-cantidad="${cantidad}" title="Agregar cantidad"><i class="bi bi-plus"></i></button>
          </td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger btn-eliminar-item" data-idx="${idx}" data-item-id="${it.id}"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `);
    });
    $('#totalPedido').text(formatear(total));
  }

  // +/- cantidad en items del pedido (mesa)
  $(document).on('click', '.btn-mas-item', async function(){
    const id = $(this).data('item-id');
    const cant = Number($(this).data('cantidad')) + 1;
    try {
      const r = await fetch(`/api/mesas/items/${id}/cantidad`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad: cant }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      await cargarPedido(pedidoActual.id);
    } catch (e) { Swal.fire({ icon: 'error', title: e.message }); }
  });

  $(document).on('click', '.btn-menos-item', async function(){
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

  $(document).on('click', '.btn-eliminar-item', async function(){
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
  async function abrirPedido(mesaId, mesaNumero){
    try{
      const resp = await fetch('/api/mesas/abrir', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mesa_id: mesaId })});
      const data = await resp.json();
      if(!resp.ok) throw new Error(data.error||'Error al abrir pedido');
      pedidoActual = data.pedido;
      $('#pedidoMesa').text(mesaNumero);
      await cargarPedido(pedidoActual.id);
      canvas.show();
    }catch(err){
      Swal.fire({icon:'error', title: err.message});
    }
  }

  async function cargarPedido(pedidoId){
    const resp = await fetch(`/api/mesas/pedidos/${pedidoId}`);
    const data = await resp.json();
    if(!resp.ok) throw new Error(data.error||'Error al cargar pedido');
    items = data.items || [];
    renderItems();
  }

  // Buscar productos
  let to;
  $('#buscarProductoMesa').on('input', function(){
    clearTimeout(to);
    const q = this.value.trim();
    if(q.length < 2){ $('#resultadosProductoMesa').empty(); return; }
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

  // Selección rápida: cantidad 1 por defecto + nota para cocina (oculta offcanvas durante todo el flujo)
  async function seleccionarProducto(p){
    await runWithOffcanvasHidden(async () => {
      const notaRes = await Swal.fire({
        title: 'Nota para cocina (opcional)',
        input: 'text', inputPlaceholder: 'Ej: sin cebolla, sin queso...', showCancelButton: true,
        didOpen: () => {
          const inp = document.querySelector('.swal2-input');
          if (inp) {
            ['keydown','keyup','keypress','paste','copy','cut','contextmenu'].forEach(evt => {
              inp.addEventListener(evt, e => e.stopPropagation());
            });
          }
        }
      });
      if (!notaRes.isConfirmed) return;
      const unidad = 'UND';
      const precio = p.precio_unidad;
      const body = { producto_id: p.id, cantidad: 1, unidad, precio: Number(precio), nota: (notaRes.value || '').trim() };
      const resp = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/items`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await resp.json();
      if(!resp.ok) return Swal.fire({icon:'error', title: data.error||'Error al agregar'});
      await cargarPedido(pedidoActual.id);
      $('#buscarProductoMesa').val('').focus();
    });
  }

  // Enviar todos los items pendientes a cocina
  $('#btnEnviarCocina').on('click', async function(){
    try{
      const pendientes = items.filter(i => i.estado === 'pendiente');
      for(const it of pendientes){
        await fetch(`/api/mesas/items/${it.id}/enviar`, { method:'PUT' });
      }
      await cargarPedido(pedidoActual.id);
      Swal.fire({icon:'success', title:'Enviado a cocina'});
    }catch(err){
      Swal.fire({icon:'error', title:'No se pudo enviar a cocina'});
    }
  });

  // Mover pedido a otra mesa (handler compartido)
  async function handleMoverMesa(){
    try{
      // Obtener mesas disponibles
      const resp = await fetch('/api/mesas/listar');
      const mesas = await resp.json();
      const libres = mesas.filter(m => (m.pedidos_abiertos||0) === 0 && m.id !== pedidoActual.mesa_id);
      if(libres.length === 0){
        return Swal.fire({ icon:'info', title:'No hay mesas libres' });
      }

      const options = libres.reduce((acc, m) => { acc[m.id] = `Mesa ${m.numero}${m.descripcion? ' - '+m.descripcion:''}`; return acc; }, {});
      const { value: destino } = await runWithOffcanvasHidden(async () => {
        return await Swal.fire({ title:'Mover a mesa', input:'select', inputOptions: options, inputPlaceholder:'Seleccione mesa destino', showCancelButton:true });
      });
      if(!destino) return;

      const r = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/mover`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mesa_destino_id: Number(destino) }) });
      const data = await r.json();
      if(!r.ok) throw new Error(data.error||'No se pudo mover el pedido');

      // Actualizar etiqueta de mesa y recargar items
      const mesaSel = libres.find(m => m.id === Number(destino));
      if(mesaSel){ $('#pedidoMesa').text(mesaSel.numero); }
      await cargarPedido(pedidoActual.id);
      Swal.fire({ icon:'success', title:'Pedido movido' });
    }catch(err){
      Swal.fire({ icon:'error', title: err.message });
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
        const badge = card.querySelector('.estado-badge');
        if (badge) {
          badge.textContent = m.estado;
          badge.classList.remove('bg-success','bg-warning','bg-secondary');
          badge.classList.add(m.estado === 'libre' ? 'bg-success' : (m.estado === 'ocupada' ? 'bg-warning' : 'bg-secondary'));
        }
      });
    } catch (_) { /* ignorar errores de red */ }
  }

  // refrescar cada 3s
  setInterval(refreshMesas, 3000);
  // primera carga
  refreshMesas();

  // Facturar pedido - Usa cliente predeterminado automáticamente
  $('#btnFacturarPedido').on('click', async function(){
    try{
      if(!pedidoActual || !pedidoActual.id){
        Swal.fire({icon:'error', title: 'No hay pedido activo'});
        return;
      }
      
      if(items.length === 0){
        Swal.fire({icon:'warning', title: 'El pedido no tiene items'});
        return;
      }
      
      // Calcular total del pedido desde los items actuales
      let totalPedido = 0;
      items.forEach(it => {
        const cantidad = Number(it.cantidad || 0);
        const precio = Number((it.precio_unitario != null ? it.precio_unitario : it.precio) || 0);
        const subtotal = Number(it.subtotal != null ? it.subtotal : (cantidad * precio));
        totalPedido += subtotal;
      });
      
      if(totalPedido <= 0){
        Swal.fire({icon:'warning', title: 'El total del pedido es cero'});
        return;
      }
      
      // Obtener cliente predeterminado automáticamente
      const cliente = await getOrCreateConsumidorFinal();
      if(!cliente || !cliente.id){
        Swal.fire({icon:'error', title: 'No se pudo obtener el cliente predeterminado'});
        return;
      }
      
      // Mostrar modal de pago
      await mostrarModalPago(totalPedido, cliente.id);
    }catch(err){
      Swal.fire({icon:'error', title: err.message});
    }
  });
  
  // Función para mostrar modal de pago
  async function mostrarModalPago(total, clienteId){
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
    $('.payment-card').off('click').on('click', function(){
      $('.payment-card').removeClass('selected');
      $(this).addClass('selected');
      formaPagoSeleccionada = $(this).data('payment-type');
      
      if(formaPagoSeleccionada === 'efectivo'){
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
    $('.denominacion-btn').off('click').on('click', function(){
      $('.denominacion-btn').removeClass('selected');
      $(this).addClass('selected');
      montoRecibido = parseFloat($(this).data('valor'));
      $('#montoManual').val(montoRecibido);
      calcularCambio(total, montoRecibido);
      $('#btnConfirmarPago').prop('disabled', false);
    });
    
    // Handler para monto manual
    function usarMontoManual(){
      const valor = parseFloat($('#montoManual').val()) || 0;
      if(valor < total){
        Swal.fire({icon:'warning', title: 'El monto debe ser mayor o igual al total'});
        return;
      }
      montoRecibido = valor;
      $('.denominacion-btn').removeClass('selected');
      calcularCambio(total, valor);
      $('#btnConfirmarPago').prop('disabled', false);
    }
    
    $('#montoManual').off('input keypress').on('input', function(){
      const valor = parseFloat($(this).val()) || 0;
      if(valor > 0){
        $('.denominacion-btn').removeClass('selected');
        if(valor >= total){
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
    }).on('keypress', function(e){
      if(e.which === 13){ // Enter
        e.preventDefault();
        usarMontoManual();
      }
    });
    
    $('#btnUsarMontoManual').off('click').on('click', usarMontoManual);
    
    // Handler para confirmar pago
    $('#btnConfirmarPago').off('click').on('click', async function(){
      if(!formaPagoSeleccionada){
        Swal.fire({icon:'warning', title: 'Seleccione una forma de pago'});
        return;
      }
      
      if(formaPagoSeleccionada === 'efectivo' && (!montoRecibido || montoRecibido < total)){
        Swal.fire({icon:'warning', title: 'El monto recibido debe ser mayor o igual al total'});
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
      
      try{
        const resp = await fetch(`/api/mesas/pedidos/${pedidoActual.id}/facturar`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            cliente_id: clienteId,
            forma_pago: formaPagoSeleccionada
          })
        });
        const data = await resp.json();
        if(!resp.ok) throw new Error(data.error || 'Error al facturar');
        
        // Cerrar loading inmediatamente
        Swal.close();
        
        // Cerrar modal de pago y offcanvas de pedido ANTES de mostrar factura
        const modalPago = bootstrap.Modal.getInstance(document.getElementById('modalPago'));
        if(modalPago) modalPago.hide();
        canvas.hide();
        
        // Mostrar factura INMEDIATAMENTE (sin esperar modales)
        mostrarFacturaEnSidebar(data.factura_id, {
          formaPago: formaPagoSeleccionada,
          total: total,
          recibido: montoRecibido
        });
        
        // Mostrar información de cambio de forma no bloqueante (toast)
        if(formaPagoSeleccionada === 'efectivo' && montoRecibido > total){
          const cambio = montoRecibido - total;
          Swal.fire({
            icon: 'success',
            title: 'Factura generada',
            html: `
              <div class="text-start">
                <p><strong>Total:</strong> ${formatear(total)}</p>
                <p><strong>Recibido:</strong> ${formatear(montoRecibido)}</p>
                <p class="fs-4 text-success"><strong>Cambio:</strong> ${formatear(cambio)}</p>
              </div>
            `,
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar'
          });
        }
      } catch(err){
        Swal.fire({icon:'error', title: err.message});
      }
    });
    
    modal.show();
  }
  
  // Función para generar denominaciones según el total
  function generarDenominaciones(total){
    const denominaciones = [10000, 20000, 50000, 100000, 200000, 500000];
    const container = $('#denominacionesContainer');
    container.empty();
    
    // Filtrar denominaciones que sean mayores o iguales al total
    const disponibles = denominaciones.filter(d => d >= total);
    
    if(disponibles.length === 0){
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
  function calcularCambio(total, recibido){
    if(recibido < total){
      $('#infoCambio').hide();
      return;
    }
    const cambio = recibido - total;
    $('#montoCambio').text(formatear(cambio));
    $('#montoRecibido').text(formatear(recibido));
    $('#infoCambio').slideDown();
  }
  
  // Función para mostrar factura en sidebar (optimizada para carga inmediata)
  function mostrarFacturaEnSidebar(facturaId, infoPago = null){
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
    if(infoPago && infoPago.formaPago === 'efectivo' && infoPago.recibido > infoPago.total){
      const cambio = infoPago.recibido - infoPago.total;
      // Puedes agregar un badge o texto adicional aquí si quieres
    }
    
    // Cargar factura en iframe (se carga mientras el sidebar ya está visible)
    facturaFrame.src = `/api/facturas/${facturaId}/imprimir`;
    
    // Ocultar loading cuando el iframe carga
    facturaFrame.onload = function(){
      facturaLoading.style.display = 'none';
    };
    
    // Handler para imprimir
    $('#btnImprimirFactura').off('click').on('click', function(){
      if(facturaFrame.contentWindow){
        try {
          facturaFrame.contentWindow.print();
        } catch(e) {
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
    $('#canvasFactura').off('hidden.bs.offcanvas').on('hidden.bs.offcanvas', function(){
      facturaFrame.src = 'about:blank';
      facturaNumero.textContent = '';
      facturaLoading.style.display = 'flex';
      facturaFrame.onload = null; // Limpiar handler
    });
    
    // Manejar errores de carga
    facturaFrame.onerror = function(){
      facturaLoading.innerHTML = `
        <div class="text-center text-danger">
          <i class="bi bi-exclamation-triangle display-4 d-block mb-2"></i>
          <div>Error al cargar la factura</div>
          <button class="btn btn-primary mt-3" onclick="location.reload()">Recargar página</button>
        </div>
      `;
    };
  }

  // Ocultar temporalmente el panel lateral (offcanvas) durante modales para evitar bloquear copiar/pegar
  async function runWithOffcanvasHidden(action){
    const el = document.getElementById('canvasPedido');
    const wasOpen = el && el.classList.contains('show');
    if(wasOpen){
      try{ canvas.hide(); }catch(_){/* noop */}
      // esperar a que termine animación
      await new Promise(r => setTimeout(r, 250));
    }
    try{
      const result = await action();
      return result;
    } finally {
      if(wasOpen){
        try{ canvas.show(); }catch(_){/* noop */}
      }
    }
  }

  function buildPedidoResumenHtml(){
    let total = 0;
    const rows = (items||[]).map(it => {
      const cantidad = Number(it.cantidad||0);
      const precio = Number((it.precio_unitario!=null?it.precio_unitario:it.precio)||0);
      const subtotal = Number(it.subtotal!=null?it.subtotal:(cantidad*precio));
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
  async function getOrCreateConsumidorFinal(){
    // Buscar por nombre
    try{
      const r = await fetch('/api/clientes/buscar?q=consumidor%20final');
      const list = await r.json();
      const cf = list.find(c => (c.nombre||'').toLowerCase() === 'consumidor final');
      if(cf) return cf;
    }catch(_){/* noop */}
    // Crear si no existe
    try{
      const r = await fetch('/api/clientes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nombre: 'Consumidor final' }) });
      if(r.ok){ const cf = await r.json(); return { id: cf.id, nombre: 'Consumidor final' }; }
    }catch(_){/* noop */}
    // Último recurso: retornar marcador para evitar bloqueo
    return { id: null, nombre: 'Consumidor final' };
  }

  async function buscarClientesPorNombre(q){
    const resp = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(q)}`);
    if(!resp.ok) return [];
    return await resp.json();
  }

  async function seleccionarClienteConBusqueda(){
    const defaultCliente = await getOrCreateConsumidorFinal();
    let seleccionado = defaultCliente;
    // Bucle para permitir crear cliente y luego usarlo
    // Confirm = Usar cliente; Deny = Crear cliente; Cancel = cancelar flujo
    // Tras crear, retornamos el nuevo cliente directamente
    // Diseño con buscador y lista, y default Consumidor final
    /* eslint no-constant-condition: 0 */
    while(true){
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
            ['keydown','keyup','keypress','paste','copy','cut','contextmenu'].forEach(evt => {
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
          li.onclick = (e)=>{ e.preventDefault(); marcarSeleccion(li, seleccionado); };
          $list.appendChild(li);

          // Toggle resumen
          const btnRes = document.getElementById('btnToggleResumen');
          const contRes = document.getElementById('contenedorResumen');
          if(btnRes && contRes){
            btnRes.addEventListener('click', ()=>{
              const visible = contRes.style.display !== 'none';
              contRes.style.display = visible ? 'none' : 'block';
              btnRes.classList.toggle('active', !visible);
              btnRes.innerHTML = !visible ? '<i class="bi bi-receipt"></i> Ocultar pedido' : '<i class="bi bi-receipt"></i> Ver pedido';
            });
          }

          let to;
          function marcarSeleccion(el, cliente){
            seleccionado = cliente;
            document.querySelectorAll('#resultadosClientesMesa .list-group-item').forEach(x=>x.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('cfNombre').textContent = cliente.nombre;
          }
          async function doSearch(){
            const q = ($input.value||'').trim();
            if(q.length < 2){ return; }
            const res = await buscarClientesPorNombre(q);
            $list.innerHTML = '';
            if(res.length === 0){
              const empty = document.createElement('div');
              empty.className = 'list-group-item text-muted';
              empty.textContent = 'Sin resultados';
              $list.appendChild(empty);
              return;
            }
            res.forEach(c => {
              const a = document.createElement('a');
              a.href = '#'; a.className = 'list-group-item list-group-item-action';
              a.innerHTML = `<div><strong>${c.nombre}</strong></div><div class="small text-muted">${c.telefono||''} ${c.direccion? '• '+c.direccion:''}</div>`;
              a.onclick = (e)=>{ e.preventDefault(); marcarSeleccion(a, c); };
              $list.appendChild(a);
            });
          }
          $input.addEventListener('input', ()=>{ clearTimeout(to); to = setTimeout(doSearch, 250); });
        }
      });

      if(result.isDenied){
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
            ['nuevoCliNombre','nuevoCliTel','nuevoCliDir'].forEach(id => {
              const el = document.getElementById(id);
              if(!el) return;
              ['keydown','keyup','keypress','paste','copy','cut','contextmenu'].forEach(evt => {
                el.addEventListener(evt, (e) => {
                  e.stopPropagation();
                });
              });
            });
          },
          preConfirm: () => {
            const nombre = (document.getElementById('nuevoCliNombre').value||'').trim();
            const telefono = (document.getElementById('nuevoCliTel').value||'').trim();
            const direccion = (document.getElementById('nuevoCliDir').value||'').trim();
            if(!nombre){
              Swal.showValidationMessage('El nombre es requerido');
              return false;
            }
            return { nombre, telefono, direccion };
          }
        });
        if(nuevo.isConfirmed){
          const body = nuevo.value;
          try{
            const resp = await fetch('/api/clientes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
            if(!resp.ok){
              const e = await resp.json();
              throw new Error(e.error || 'Error al crear cliente');
            }
            const data = await resp.json();
            const creado = { id: data.id, nombre: body.nombre, telefono: body.telefono, direccion: body.direccion };
            await Swal.fire({ icon:'success', title:'Cliente creado' });
            return creado;
          }catch(err){
            await Swal.fire({ icon:'error', title: err.message||'Error al crear cliente' });
            continue; // volver al selector
          }
        } else {
          continue; // volver al selector
        }
      }

      if(result.isConfirmed){
        return seleccionado;
      }
      // Cancelado
      return null;
    }
  }

  // Clicks en tarjetas de mesa
  $('#gridMesas').on('click', '.btnAbrirPedido', function(){
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const titulo = card.find('.card-title').text().replace('Mesa ','');
    abrirPedido(mesaId, titulo);
  });

  // Liberar mesa desde tarjeta
  $('#gridMesas').on('click', '.btnLiberarMesa', async function(){
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const mesaNum = card.find('.card-title').text().replace('Mesa ', '');
    const ok = await Swal.fire({ title:`Liberar mesa ${mesaNum}?`, text:'Solo si no tiene items activos', icon:'warning', showCancelButton:true, confirmButtonText:'Sí, liberar' });
    if(!ok.isConfirmed) return;
    try{
      const r = await fetch(`/api/mesas/${mesaId}/liberar`, { method:'PUT' });
      const data = await r.json();
      if(!r.ok) throw new Error(data.error||'No se pudo liberar');
      Swal.fire({ icon:'success', title:'Mesa liberada' }).then(()=> location.reload());
    }catch(err){
      Swal.fire({ icon:'error', title: err.message });
    }
  });

  // Liberar desde header del offcanvas
  $('#btnLiberarMesaHeader').on('click', async function(){
    const ok = await Swal.fire({ title:`Liberar mesa ${$('#pedidoMesa').text()}?`, text:'Solo si no tiene items activos', icon:'warning', showCancelButton:true, confirmButtonText:'Sí, liberar' });
    if(!ok.isConfirmed) return;
    try{
      const r = await fetch(`/api/mesas/${pedidoActual.mesa_id}/liberar`, { method:'PUT' });
      const data = await r.json();
      if(!r.ok) throw new Error(data.error||'No se pudo liberar');
      Swal.fire({ icon:'success', title:'Mesa liberada' }).then(()=> location.reload());
    }catch(err){
      Swal.fire({ icon:'error', title: err.message });
    }
  });

  // Ver pedido: reutiliza abrirPedido (recupera si existe, o crea si no)
  $('#gridMesas').on('click', '.btnVerPedido', function(){
    const card = $(this).closest('.card');
    const mesaId = card.data('mesa-id');
    const titulo = card.find('.card-title').text().replace('Mesa ','');
    abrirPedido(mesaId, titulo);
  });

  // Crear nueva mesa (rápida)
  $('#btnNuevaMesa').on('click', async function(){
    const { value: numero } = await Swal.fire({ title:'Número de mesa', input:'text', showCancelButton:true });
    if(!numero) return;
    const { value: descripcion } = await Swal.fire({ title:'Descripción', input:'text', showCancelButton:true });
    const resp = await fetch('/api/mesas/crear', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ numero, descripcion }) });
    if(!resp.ok){ const err = await resp.json(); return Swal.fire({icon:'error', title: err.error||'Error'}); }
    Swal.fire({icon:'success', title:'Mesa creada'}).then(()=> location.reload());
  });
});


