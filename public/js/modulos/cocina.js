/**
 * Kitchen JavaScript - Groups items by table with nested cards
 * Related to: views/cocina.ejs, routes/cocina.js
 */

$(function () {
    // Allow opening tab directly with ?tab=listos
    function activarTabDesdeQuery() {
        // For mesero role, always show "Listos" tab
        const userRole = document.body.getAttribute('data-user-role') || '';
        if (userRole === 'mesero') {
            const triggerEl = document.querySelector('#tabListos-tab');
            if (triggerEl) {
                const tabObj = new bootstrap.Tab(triggerEl);
                tabObj.show();
            }
            return;
        }

        // For other roles, allow query parameter
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'listos') {
            const triggerEl = document.querySelector('#tabListos-tab');
            if (triggerEl) {
                const tabObj = new bootstrap.Tab(triggerEl);
                tabObj.show();
            }
        }
    }

    /**
     * Load kitchen queue
     */
    async function cargarCola() {
        try {
            const resp = await fetch('/api/cocina/cola');
            if (!resp.ok) throw new Error('Error al cargar cola');
            const items = await resp.json();
            render(items);
        } catch (error) {
            console.error('Error al cargar cola:', error);
        }
    }

    /**
     * Create card for individual item (sub-card inside mesa card)
     */
    function cardItem(it) {
        const estadoBadge = it.estado === 'preparando'
            ? '<span class="badge bg-warning">Preparando</span>'
            : (it.estado === 'listo'
                ? '<span class="badge bg-success">Listo</span>'
                : '<span class="badge bg-secondary">Enviado</span>');

        const actions = `
            <div class="mt-2 d-flex gap-2 flex-wrap">
                ${it.estado === 'enviado'
                ? `<button class="btn btn-sm btn-primary" data-action="prep" data-id="${it.id}">
                        <i class="bi bi-play"></i> Preparar
                       </button>`
                : ''}
                ${it.estado === 'preparando'
                ? `<button class="btn btn-sm btn-success" data-action="listo" data-id="${it.id}">
                        <i class="bi bi-check2"></i> Listo
                       </button>`
                : ''}
                ${it.estado === 'listo'
                ? `<button class="btn btn-sm btn-outline-dark" data-action="servido" data-id="${it.id}">
                        <i class="bi bi-box-seam"></i> Recogido
                       </button>`
                : ''}
            </div>`;

        return `
            <div class="card mb-2 item-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="producto">${it.producto_nombre}</span>
                                ${estadoBadge}
                                <span class="badge bg-dark cantidad-badge">${it.cantidad} ${it.unidad_medida || 'UND'}</span>
                            </div>
                            ${it.nota ? `<div class="text-danger fw-bold small mb-1"><i class="bi bi-exclamation-triangle"></i> ${it.nota}</div>` : ''}
                            <div class="small text-muted">
                                <i class="bi bi-clock"></i> ${new Date(it.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                ${it.enviado_at ? ` • Enviado: ${new Date(it.enviado_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </div>
                        </div>
                    </div>
                    ${actions}
                </div>
            </div>`;
    }

    /**
     * Create card for mesa (parent card containing items)
     */
    function cardMesa(mesaNumero, items) {
        const itemsHtml = items.map(it => cardItem(it)).join('');
        return `
            <div class="card mb-3 mesa-card">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-table me-2"></i>
                        <strong>Mesa ${mesaNumero}</strong>
                        <span class="badge bg-light text-dark ms-2">${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}</span>
                    </div>
                    <div class="badge bg-light text-dark">
                        Pedido #${items[0]?.pedido_id || ''}
                    </div>
                </div>
                <div class="card-body">
                    ${itemsHtml}
                </div>
            </div>`;
    }

    /**
     * Group items by mesa and render
     */
    function render(items) {
        const cola = $('#listaCola').empty();
        const listos = $('#listaListos').empty();

        // Filter items by state
        const itemsEnCocina = items.filter(it => it.estado !== 'listo');
        const itemsListos = items.filter(it => it.estado === 'listo');

        // Render summary of totals (only for "En cocina" items)
        renderResumen(itemsEnCocina);

        // Group by mesa for "En cocina" tab
        if (itemsEnCocina.length > 0) {
            const porMesaEnCocina = new Map();
            itemsEnCocina.forEach(it => {
                const key = it.mesa_numero;
                if (!porMesaEnCocina.has(key)) {
                    porMesaEnCocina.set(key, []);
                }
                porMesaEnCocina.get(key).push(it);
            });

            // Sort by mesa number (numeric)
            [...porMesaEnCocina.entries()]
                .sort((a, b) => {
                    const numA = parseInt(a[0]) || 0;
                    const numB = parseInt(b[0]) || 0;
                    return numA - numB;
                })
                .forEach(([mesa, arr]) => {
                    cola.append(cardMesa(mesa, arr));
                });
        } else {
            cola.append('<div class="text-center text-muted py-4">No hay items en cocina</div>');
        }

        // Group by mesa for "Listos" tab
        if (itemsListos.length > 0) {
            const porMesaListos = new Map();
            itemsListos.forEach(it => {
                const key = it.mesa_numero;
                if (!porMesaListos.has(key)) {
                    porMesaListos.set(key, []);
                }
                porMesaListos.get(key).push(it);
            });

            // Sort by mesa number (numeric)
            [...porMesaListos.entries()]
                .sort((a, b) => {
                    const numA = parseInt(a[0]) || 0;
                    const numB = parseInt(b[0]) || 0;
                    return numA - numB;
                })
                .forEach(([mesa, arr]) => {
                    listos.append(cardMesa(mesa, arr));
                });
        } else {
            listos.append('<div class="text-center text-muted py-4">No hay items listos</div>');
        }
    }

    /**
     * Render the prep summary (totals to prepare)
     */
    function renderResumen(items) {
        const container = $('#resumenCocina');
        if (container.length === 0) return;
        container.empty();

        if (items.length === 0) {
            return;
        }

        // Aggregate by product and note
        const resumen = new Map();
        items.forEach(it => {
            // Se agrupa por nombre de producto y la nota (si existe)
            const key = `${it.producto_nombre}|${it.nota || ''}`;
            if (!resumen.has(key)) {
                resumen.set(key, {
                    nombre: it.producto_nombre,
                    nota: it.nota,
                    total: 0,
                    pendientes: 0, // items en estado 'enviado'
                    unidades: new Set()
                });
            }
            const data = resumen.get(key);
            data.total += Number(it.cantidad);
            if (it.estado === 'enviado') {
                data.pendientes += Number(it.cantidad);
            }
            data.unidades.add(it.unidad_medida || 'UND');
        });

        let html = `
            <div class="card shadow-sm border-0 border-start border-4 border-primary">
                <div class="card-header bg-white py-3">
                    <h5 class="card-title mb-0 fw-bold text-primary">
                        <i class="bi bi-list-check me-2"></i>Totales a preparar (Resumen)
                    </h5>
                </div>
                <div class="card-body bg-light px-2">
                    <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2">
        `;

        resumen.forEach((data) => {
            const unidadStr = Array.from(data.unidades).join('/');
            html += `
                <div class="col">
                    <div class="card h-100 border-0 shadow-sm resumen-item">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="h2 fw-bold text-primary mb-0">${data.total}</span>
                                <span class="badge bg-secondary">${unidadStr}</span>
                            </div>
                            <h6 class="fw-bold mb-1">${data.nombre}</h6>
                            ${data.nota ? `<div class="badge bg-danger text-wrap text-start w-100 mb-2" style="font-size: 0.75rem;">${data.nota}</div>` : '<div class="small text-muted mb-2">Estándar</div>'}
                            
                            ${data.pendientes > 0 ? `
                                <button class="btn btn-sm btn-primary w-100 mt-1 btn-preparar-lote" 
                                    data-nombre="${data.nombre}" 
                                    data-nota="${data.nota || ''}">
                                    <i class="bi bi-play-fill"></i> Preparar (${data.pendientes})
                                </button>
                            ` : `
                                <div class="text-center small text-success fw-bold mt-1">
                                    <i class="bi bi-check-circle"></i> Todos en preparación
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        container.append(html);
    }

    // Evento para preparar lote
    $(document).on('click', '.btn-preparar-lote', async function () {
        const btn = $(this);
        const productoNombre = btn.data('nombre');
        const nota = btn.data('nota');

        btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');

        try {
            const resp = await fetch('/api/cocina/preparar-lote', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productoNombre,
                    nota,
                    estado: 'preparando'
                })
            });

            if (!resp.ok) throw new Error('Error al procesar lote');
            await cargarCola();
        } catch (error) {
            console.error('Error batch:', error);
            alert('Error al preparar el lote');
            btn.prop('disabled', false).html('<i class="bi bi-play-fill"></i> Preparar');
        }
    });

    // Action handlers
    $(document).on('click', '[data-action="prep"]', async function () {
        const id = this.dataset.id;
        try {
            await fetch(`/api/cocina/item/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'preparando' })
            });
            await cargarCola();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar estado');
        }
    });

    $(document).on('click', '[data-action="listo"]', async function () {
        const id = this.dataset.id;
        try {
            await fetch(`/api/cocina/item/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'listo' })
            });
            await cargarCola();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar estado');
        }
    });

    $(document).on('click', '[data-action="servido"]', async function () {
        const id = this.dataset.id;
        try {
            await fetch(`/api/mesas/items/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'servido' })
            });
            await cargarCola();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar estado');
        }
    });

    // Auto-refresh every 5 seconds
    cargarCola();
    setInterval(cargarCola, 5000);
    activarTabDesdeQuery();
});
