/**
 * Costeo - Insumos, recetas y configuración de costeo
 * API base: /costeo
 */

(function () {
    const base = '/costeo';
    const canEdit = typeof window.USER_PERMISOS !== 'undefined' && window.USER_PERMISOS && window.USER_PERMISOS.includes('costeo.editar');

    function api(path, options = {}) {
        const url = base + path;
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(options.headers || {})
            },
            credentials: 'same-origin'
        }).then(res => {
            if (!res.ok) return res.json().then(j => Promise.reject(new Error(j.error || res.statusText)));
            return res.json();
        });
    }

    // --- Insumos ---
    function loadInsumos() {
        return api('/api/insumos').then(list => {
            const tbody = document.querySelector('#tablaInsumos tbody');
            tbody.innerHTML = '';
            (list || []).forEach(ins => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(ins.codigo)}</td>
                    <td>${escapeHtml(ins.nombre)}</td>
                    <td>${escapeHtml(ins.unidad_compra)}</td>
                    <td>${formatMoney(ins.costo_unitario)}</td>
                    <td class="text-end">
                        ${canEdit ? `<button class="btn btn-sm btn-outline-primary me-1 btnEditInsumo" data-id="${ins.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger btnElimInsumo" data-id="${ins.id}">Eliminar</button>` : ''}
                    </td>`;
                tbody.appendChild(tr);
            });
            return list;
        });
    }

    function openInsumoModal(insumo) {
        const modal = document.getElementById('insumoModal');
        const title = document.getElementById('insumoModalTitle');
        document.getElementById('insumoId').value = insumo ? insumo.id : '';
        document.getElementById('insumoCodigo').value = insumo ? insumo.codigo : '';
        document.getElementById('insumoNombre').value = insumo ? insumo.nombre : '';
        document.getElementById('insumoUnidad').value = insumo ? insumo.unidad_compra : 'UND';
        document.getElementById('insumoCosto').value = insumo != null ? insumo.costo_unitario : '0';
        title.textContent = insumo ? 'Editar Insumo' : 'Nuevo Insumo';
        new bootstrap.Modal(modal).show();
    }

    document.getElementById('btnNuevoInsumo')?.addEventListener('click', () => openInsumoModal(null));
    document.getElementById('btnGuardarInsumo')?.addEventListener('click', () => {
        const id = document.getElementById('insumoId').value;
        const payload = {
            codigo: document.getElementById('insumoCodigo').value.trim(),
            nombre: document.getElementById('insumoNombre').value.trim(),
            unidad_compra: document.getElementById('insumoUnidad').value,
            costo_unitario: parseFloat(document.getElementById('insumoCosto').value) || 0
        };
        const promise = id ? api('/api/insumos/' + id, { method: 'PUT', body: JSON.stringify(payload) }) : api('/api/insumos', { method: 'POST', body: JSON.stringify(payload) });
        promise.then(() => {
            bootstrap.Modal.getInstance(document.getElementById('insumoModal')).hide();
            loadInsumos();
            showToast('Insumo guardado', 'success');
        }).catch(err => showToast(err.message || 'Error', 'danger'));
    });

    document.getElementById('tablaInsumos')?.addEventListener('click', (e) => {
        const id = e.target.closest('[data-id]')?.getAttribute('data-id');
        if (!id) return;
        if (e.target.classList.contains('btnEditInsumo')) {
            api('/api/insumos/' + id).then(ins => openInsumoModal(ins)).catch(err => showToast(err.message, 'danger'));
        } else if (e.target.classList.contains('btnElimInsumo')) {
            if (!confirm('¿Eliminar este insumo?')) return;
            api('/api/insumos/' + id, { method: 'DELETE' }).then(() => {
                loadInsumos();
                showToast('Insumo eliminado', 'success');
            }).catch(err => showToast(err.message, 'danger'));
        }
    });

    // --- Recetas ---
    function loadRecetas() {
        return api('/api/recetas').then(list => {
            const tbody = document.querySelector('#tablaRecetas tbody');
            tbody.innerHTML = '';
            (list || []).forEach(rec => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(rec.producto_nombre || '-')}</td>
                    <td>${escapeHtml(rec.nombre_receta)}</td>
                    <td>${rec.porciones}</td>
                    <td>${formatMoney(rec.precio_venta_actual)}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-info me-1 btnVerCosteo" data-id="${rec.id}">Ver costeo</button>
                        ${canEdit ? `<button class="btn btn-sm btn-outline-primary me-1 btnEditReceta" data-id="${rec.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger btnElimReceta" data-id="${rec.id}">Eliminar</button>` : ''}
                    </td>`;
                tbody.appendChild(tr);
            });
            return list;
        });
    }

    function showCosteo(recetaId) {
        const panel = document.getElementById('costeoRecetaPanel');
        api('/api/costeo/receta/' + recetaId).then(data => {
            document.getElementById('costeoDirecto').textContent = formatMoney(data.costo_directo_porcion);
            document.getElementById('costeoIndirecto').textContent = formatMoney(data.costo_indirecto);
            document.getElementById('costeoTotal').textContent = formatMoney(data.costo_total_porcion);
            document.getElementById('costeoPrecioSug').textContent = formatMoney(data.precio_sugerido);
            document.getElementById('costeoPrecioActual').textContent = formatMoney(data.precio_venta_actual);
            document.getElementById('costeoMargen').textContent = data.margen_actual_pct != null ? data.margen_actual_pct + '%' : '-';
            panel.classList.remove('d-none');
        }).catch(() => panel.classList.add('d-none'));
    }

    document.getElementById('tablaRecetas')?.addEventListener('click', (e) => {
        const id = e.target.closest('[data-id]')?.getAttribute('data-id');
        if (!id) return;
        if (e.target.classList.contains('btnVerCosteo')) {
            showCosteo(id);
        } else if (e.target.classList.contains('btnEditReceta')) {
            openRecetaEditarModal(parseInt(id, 10));
        } else if (e.target.classList.contains('btnElimReceta')) {
            if (!confirm('¿Eliminar esta receta?')) return;
            api('/api/recetas/' + id, { method: 'DELETE' }).then(() => {
                loadRecetas();
                document.getElementById('costeoRecetaPanel').classList.add('d-none');
                showToast('Receta eliminada', 'success');
            }).catch(err => showToast(err.message, 'danger'));
        }
    });

    document.getElementById('btnNuevaReceta')?.addEventListener('click', () => {
        document.getElementById('recetaProductoId').value = '';
        document.getElementById('recetaNombreNueva').value = '';
        document.getElementById('recetaPorcionesNueva').value = '1';
    });
    document.getElementById('btnCrearReceta')?.addEventListener('click', () => {
        const producto_id = parseInt(document.getElementById('recetaProductoId').value, 10);
        const nombre_receta = document.getElementById('recetaNombreNueva').value.trim();
        const porciones = parseFloat(document.getElementById('recetaPorcionesNueva').value) || 1;
        if (!producto_id || !nombre_receta) {
            showToast('Producto y nombre de receta son requeridos', 'warning');
            return;
        }
        api('/api/recetas', { method: 'POST', body: JSON.stringify({ producto_id, nombre_receta, porciones }) })
            .then(() => {
                bootstrap.Modal.getInstance(document.getElementById('recetaNuevaModal')).hide();
                loadRecetas();
                showToast('Receta creada', 'success');
            }).catch(err => showToast(err.message, 'danger'));
    });

    let insumosList = [];
    function loadInsumosForSelect() {
        return api('/api/insumos').then(list => {
            insumosList = list || [];
            const sel = document.getElementById('ingredienteInsumo');
            sel.innerHTML = '<option value="">Agregar insumo</option>';
            insumosList.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i.id;
                opt.textContent = `${i.codigo} - ${i.nombre} (${i.unidad_compra})`;
                sel.appendChild(opt);
            });
            return insumosList;
        });
    }

    let recetaIngredientes = [];
    function openRecetaEditarModal(recetaId) {
        document.getElementById('recetaId').value = recetaId;
        recetaIngredientes = [];
        loadInsumosForSelect().then(() => api('/api/recetas/' + recetaId)).then(rec => {
            document.getElementById('recetaEditarTitle').textContent = 'Editar: ' + (rec.nombre_receta || '');
            document.getElementById('recetaNombre').value = rec.nombre_receta || '';
            document.getElementById('recetaPorciones').value = rec.porciones || 1;
            recetaIngredientes = (rec.ingredientes || []).map(ing => ({
                insumo_id: ing.insumo_id,
                cantidad: ing.cantidad,
                unidad: ing.unidad || 'g',
                insumo_nombre: ing.insumo_nombre,
                insumo_codigo: ing.insumo_codigo
            }));
            renderIngredientes();
            new bootstrap.Modal(document.getElementById('recetaEditarModal')).show();
        }).catch(err => showToast(err.message, 'danger'));
    }

    function renderIngredientes() {
        const tbody = document.getElementById('ingredientesBody');
        tbody.innerHTML = '';
        recetaIngredientes.forEach((ing, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(ing.insumo_codigo || '')} - ${escapeHtml(ing.insumo_nombre || '')}</td>
                <td>${ing.cantidad}</td>
                <td>${ing.unidad}</td>
                <td>${canEdit ? `<button type="button" class="btn btn-sm btn-outline-danger btnQuitarIng" data-idx="${idx}">Quitar</button>` : ''}</td>`;
            tbody.appendChild(tr);
        });
        if (canEdit) {
            tbody.querySelectorAll('.btnQuitarIng').forEach(btn => {
                btn.addEventListener('click', () => {
                    recetaIngredientes.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
                    renderIngredientes();
                });
            });
        }
    }

    document.getElementById('btnAgregarIngrediente')?.addEventListener('click', () => {
        const insumoId = parseInt(document.getElementById('ingredienteInsumo').value, 10);
        const cantidad = parseFloat(document.getElementById('ingredienteCantidad').value) || 0;
        const unidad = document.getElementById('ingredienteUnidad').value;
        if (!insumoId || cantidad <= 0) return;
        const ins = insumosList.find(i => i.id === insumoId);
        recetaIngredientes.push({
            insumo_id: insumoId,
            cantidad,
            unidad,
            insumo_nombre: ins ? ins.nombre : '',
            insumo_codigo: ins ? ins.codigo : ''
        });
        renderIngredientes();
        document.getElementById('ingredienteCantidad').value = '';
    });

    document.getElementById('btnGuardarReceta')?.addEventListener('click', () => {
        const recetaId = document.getElementById('recetaId').value;
        const nombre_receta = document.getElementById('recetaNombre').value.trim();
        const porciones = parseFloat(document.getElementById('recetaPorciones').value) || 1;
        const ingredientes = recetaIngredientes.map(ing => ({ insumo_id: ing.insumo_id, cantidad: ing.cantidad, unidad: ing.unidad }));
        api('/api/recetas/' + recetaId, {
            method: 'PUT',
            body: JSON.stringify({ nombre_receta, porciones, ingredientes })
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById('recetaEditarModal')).hide();
            loadRecetas();
            showToast('Receta actualizada', 'success');
        }).catch(err => showToast(err.message, 'danger'));
    });

    // --- Configuración ---
    function loadConfig() {
        return api('/api/costeo/config').then(config => {
            document.getElementById('configMetodo').value = config.metodo_indirectos || 'porcentaje';
            document.getElementById('configPorcentaje').value = config.porcentaje_indirectos ?? 35;
            document.getElementById('configCostoFijo').value = config.costo_fijo_mensual ?? 0;
            document.getElementById('configPlatosMes').value = config.platos_estimados_mes ?? 500;
            document.getElementById('configFactor').value = config.factor_carga ?? 2.5;
            document.getElementById('configMargen').value = config.margen_objetivo_default ?? 60;
            toggleConfigRows(config.metodo_indirectos);
            return config;
        });
    }

    function toggleConfigRows(metodo) {
        document.getElementById('rowPorcentaje').classList.toggle('d-none', metodo !== 'porcentaje');
        document.getElementById('rowCostoFijo').classList.toggle('d-none', metodo !== 'costo_fijo');
        document.getElementById('rowFactor').classList.toggle('d-none', metodo !== 'factor');
    }
    document.getElementById('configMetodo')?.addEventListener('change', (e) => toggleConfigRows(e.target.value));

    document.getElementById('formConfigCosteo')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            metodo_indirectos: document.getElementById('configMetodo').value,
            porcentaje_indirectos: parseFloat(document.getElementById('configPorcentaje').value) || 0,
            costo_fijo_mensual: parseFloat(document.getElementById('configCostoFijo').value) || 0,
            platos_estimados_mes: parseInt(document.getElementById('configPlatosMes').value, 10) || 500,
            factor_carga: parseFloat(document.getElementById('configFactor').value) || 2.5,
            margen_objetivo_default: parseFloat(document.getElementById('configMargen').value) || 60
        };
        api('/api/costeo/config', { method: 'PUT', body: JSON.stringify(payload) })
            .then(() => showToast('Configuración guardada', 'success'))
            .catch(err => showToast(err.message, 'danger'));
    });

    function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }
    function formatMoney(n) {
        if (n == null || isNaN(n)) return '-';
        return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    }
    function showToast(msg, type) {
        const el = document.createElement('div');
        el.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        el.style.cssText = 'top: 1rem; right: 1rem; z-index: 9999; min-width: 200px;';
        el.innerHTML = msg + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }

    // Init
    loadInsumos();
    loadRecetas();
    loadConfig();
})();
