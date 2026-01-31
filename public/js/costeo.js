/**
 * Costeo - Insumos, recetas y configuración de costeo
 * API base: /costeo
 */

(function () {
    if (window.COSTEO_SHOW_TENANT_SELECTOR) return;
    const base = '/costeo';
    let permisos = window.USER_PERMISOS;
    if (typeof permisos === 'string') try { permisos = JSON.parse(permisos); } catch (_) { permisos = []; }
    if (!Array.isArray(permisos)) permisos = [];
    const userRol = (typeof window.USER_ROL === 'string' ? window.USER_ROL : '') || '';
    const isSuperadmin = String(userRol || '').toLowerCase() === 'superadmin';
    const canEdit = permisos.includes('costeo.editar') || isSuperadmin;
    const canViewCosteo = permisos.includes('costeo.ver') || isSuperadmin;
    const canEditReceta = canViewCosteo || canEdit || true;

    function api(path, options = {}) {
        let url = base + path;
        if (isSuperadmin && window.COSTEO_TENANT_ID) {
            url += (path.indexOf('?') >= 0 ? '&' : '?') + 'tenant_id=' + window.COSTEO_TENANT_ID;
        }
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(options.headers || {})
            },
            credentials: 'same-origin'
        }).then(res => res.text().then(text => {
            let data = null;
            try {
                if (text && text.trim()) data = JSON.parse(text);
            } catch (_) {
                if (!res.ok) return Promise.reject(new Error(res.statusText || 'Error del servidor'));
                return Promise.reject(new Error('Respuesta inválida del servidor'));
            }
            if (!res.ok) return Promise.reject(new Error((data && data.error) || res.statusText || 'Error'));
            return data;
        }));
    }

    // --- Insumos ---
    function getInsumosFilters() {
        const q = document.getElementById('filtroInsumoQ')?.value?.trim() || '';
        const unidad = document.getElementById('filtroInsumoUnidad')?.value?.trim() || '';
        return { q, unidad };
    }
    function loadInsumos(filters) {
        const f = filters || getInsumosFilters();
        const qs = new URLSearchParams();
        if (f.q) qs.set('q', f.q);
        if (f.unidad) qs.set('unidad', f.unidad);
        const path = '/api/insumos' + (qs.toString() ? '?' + qs.toString() : '');
        return api(path).then(list => {
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
            if (!filters) {
                const unidades = [...new Set((list || []).map(i => i.unidad_compra).filter(Boolean))].sort();
                const sel = document.getElementById('filtroInsumoUnidad');
                if (sel) {
                    const current = sel.value;
                    sel.innerHTML = '<option value="">Todas las unidades</option>';
                    unidades.forEach(u => {
                        const opt = document.createElement('option');
                        opt.value = u;
                        opt.textContent = u;
                        if (u === current) opt.selected = true;
                        sel.appendChild(opt);
                    });
                }
            }
            return list;
        });
    }
    document.getElementById('btnFiltrarInsumos')?.addEventListener('click', () => loadInsumos());

    document.getElementById('btnCargarExcelInsumos')?.addEventListener('click', () => {
        document.getElementById('inputCargarExcelInsumos')?.click();
    });
    document.getElementById('inputCargarExcelInsumos')?.addEventListener('change', function () {
        const file = this.files && this.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('archivo', file);
        let url = base + '/api/insumos/cargar';
        if (isSuperadmin && window.COSTEO_TENANT_ID) {
            url += '?tenant_id=' + window.COSTEO_TENANT_ID;
        }
        fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
            .then(res => res.ok ? res.json() : res.json().then(j => Promise.reject(new Error(j.error || res.statusText))))
            .then((result) => {
                const { creados = 0, actualizados = 0, errores = [] } = result;
                let msg = '';
                if (creados > 0 || actualizados > 0) {
                    msg = (creados ? creados + ' creados' : '') + (actualizados ? (msg ? ', ' : '') + actualizados + ' actualizados' : '') + '.';
                }
                if (errores.length > 0) {
                    msg += (msg ? ' ' : '') + errores.length + ' fila(s) con error.';
                }
                showToast(msg || 'Carga completada', msg ? 'success' : 'info');
                loadInsumos(getInsumosFilters());
            })
            .catch(err => showToast(err.message || 'Error al cargar archivo', 'danger'));
        this.value = '';
    });

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
    function quitarBackdropModal() {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    document.getElementById('btnGuardarInsumo')?.addEventListener('click', () => {
        const id = document.getElementById('insumoId').value;
        const payload = {
            codigo: document.getElementById('insumoCodigo').value.trim(),
            nombre: document.getElementById('insumoNombre').value.trim(),
            unidad_compra: document.getElementById('insumoUnidad').value,
            costo_unitario: parseFloat(document.getElementById('insumoCosto').value) || 0
        };
        const modalEl = document.getElementById('insumoModal');
        const instance = bootstrap.Modal.getInstance(modalEl);
        const promise = id ? api('/api/insumos/' + id, { method: 'PUT', body: JSON.stringify(payload) }) : api('/api/insumos', { method: 'POST', body: JSON.stringify(payload) });
        promise.then(() => {
            if (instance) instance.hide();
            quitarBackdropModal();
            loadInsumos(getInsumosFilters()).catch(() => {});
            showToast('Insumo guardado', 'success');
        }).catch(err => {
            if (instance) instance.hide();
            quitarBackdropModal();
            showToast(err.message || 'Error al guardar', 'danger');
        });
    });

    document.getElementById('tablaInsumos')?.addEventListener('click', (e) => {
        const id = e.target.closest('[data-id]')?.getAttribute('data-id');
        if (!id) return;
        if (e.target.classList.contains('btnEditInsumo')) {
            api('/api/insumos/' + id).then(ins => openInsumoModal(ins)).catch(err => showToast(err.message, 'danger'));
        } else if (e.target.classList.contains('btnElimInsumo')) {
            if (!confirm('¿Eliminar este insumo?')) return;
            api('/api/insumos/' + id, { method: 'DELETE' }).then(() => {
                loadInsumos(getInsumosFilters());
                showToast('Insumo eliminado', 'success');
            }).catch(err => showToast(err.message, 'danger'));
        }
    });

    // --- Recetas ---
    function getRecetasFilters() {
        return {
            q: document.getElementById('filtroRecetaQ')?.value?.trim() || ''
        };
    }
    function loadRecetas(filters) {
        const f = filters || getRecetasFilters();
        const qs = new URLSearchParams();
        if (f.q) qs.set('q', f.q);
        const path = '/api/recetas' + (qs.toString() ? '?' + qs.toString() : '');
        return api(path).then(list => {
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
                        ${canEditReceta ? `<button class="btn btn-sm btn-outline-primary me-1 btnEditReceta" data-id="${rec.id}">Editar</button>` : ''}
                        ${canEdit ? `<button class="btn btn-sm btn-outline-danger btnElimReceta" data-id="${rec.id}">Eliminar</button>` : ''}
                    </td>`;
                tbody.appendChild(tr);
            });
            return list;
        });
    }
    document.getElementById('btnFiltrarRecetas')?.addEventListener('click', () => loadRecetas());

    function showCosteo(recetaId) {
        const panel = document.getElementById('costeoRecetaPanel');
        api('/api/costeo/receta/' + recetaId).then(data => {
            document.getElementById('costeoDirecto').textContent = formatMoney(data.costo_materia_prima_porcion ?? data.costo_directo_porcion);
            document.getElementById('costeoMermaPct').textContent = data.merma_pct != null ? data.merma_pct : '0';
            document.getElementById('costeoIndirecto').textContent = formatMoney(data.merma_monto ?? data.costo_indirecto);
            document.getElementById('costeoTotal').textContent = formatMoney(data.costo_total_porcion);
            document.getElementById('costeoMargenObjetivo').textContent = (data.margen_objetivo_pct != null ? data.margen_objetivo_pct : 65) + '%';
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
                loadRecetas(getRecetasFilters());
                document.getElementById('costeoRecetaPanel').classList.add('d-none');
                showToast('Receta eliminada', 'success');
            }).catch(err => showToast(err.message, 'danger'));
        }
    });
    document.getElementById('recetas-tab')?.addEventListener('shown.bs.tab', () => loadRecetas());

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
            .then((result) => {
                bootstrap.Modal.getInstance(document.getElementById('recetaNuevaModal')).hide();
                loadRecetas(getRecetasFilters());
                showToast('Receta creada. Agregá los insumos a continuación.', 'success');
                if (result && result.id) {
                    setTimeout(() => openRecetaEditarModal(result.id), 300);
                }
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

    document.getElementById('ingredienteInsumo')?.addEventListener('change', function () {
        const insumoId = parseInt(this.value, 10);
        const ins = insumosList.find(i => i.id === insumoId);
        const unidadEl = document.getElementById('ingredienteUnidad');
        if (unidadEl && ins && ins.unidad_compra) {
            unidadEl.value = ins.unidad_compra;
        }
    });

    document.getElementById('btnAgregarIngrediente')?.addEventListener('click', () => {
        const insumoId = parseInt(document.getElementById('ingredienteInsumo').value, 10);
        const cantidad = parseFloat(document.getElementById('ingredienteCantidad').value) || 0;
        const unidadEl = document.getElementById('ingredienteUnidad');
        const unidad = unidadEl ? unidadEl.value : 'g';
        if (!insumoId || cantidad <= 0) return;
        const ins = insumosList.find(i => i.id === insumoId);
        recetaIngredientes.push({
            insumo_id: insumoId,
            cantidad,
            unidad: ins && ins.unidad_compra ? ins.unidad_compra : unidad,
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

    // --- Alertas ---
    function loadAlertas() {
        const loadingEl = document.getElementById('alertasLoading');
        const contentEl = document.getElementById('alertasContent');
        if (!loadingEl || !contentEl) return;
        loadingEl.classList.remove('d-none');
        contentEl.classList.add('d-none');
        api('/api/costeo/alertas').then(data => {
            const fmt = (n) => n != null && !isNaN(n) ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '-';
            const margenBajo = data.margenBajo || [];
            const precioBajo = data.precioBajoCosto || [];
            const sinReceta = data.sinReceta || [];
            const tbodyMB = document.getElementById('alertasMargenBajo');
            const tbodyPB = document.getElementById('alertasPrecioBajo');
            const tbodySR = document.getElementById('alertasSinReceta');
            const vacioMB = document.getElementById('alertasMargenBajoVacio');
            const vacioPB = document.getElementById('alertasPrecioBajoVacio');
            const vacioSR = document.getElementById('alertasSinRecetaVacio');
            if (tbodyMB) {
                tbodyMB.innerHTML = margenBajo.map(it => `
                    <tr>
                        <td>${escapeHtml(it.producto_nombre)}</td>
                        <td>${escapeHtml(it.producto_codigo)}</td>
                        <td class="text-end">$${fmt(it.precio_venta_actual)}</td>
                        <td class="text-end">$${fmt(it.costo_total_porcion)}</td>
                        <td class="text-end text-warning">${it.margen_actual_pct != null ? it.margen_actual_pct + '%' : '-'}</td>
                    </tr>`).join('');
                if (vacioMB) vacioMB.classList.toggle('d-none', margenBajo.length > 0);
            }
            if (tbodyPB) {
                tbodyPB.innerHTML = precioBajo.map(it => `
                    <tr>
                        <td>${escapeHtml(it.producto_nombre)}</td>
                        <td>${escapeHtml(it.producto_codigo)}</td>
                        <td class="text-end">$${fmt(it.precio_venta_actual)}</td>
                        <td class="text-end text-danger">$${fmt(it.costo_total_porcion)}</td>
                    </tr>`).join('');
                if (vacioPB) vacioPB.classList.toggle('d-none', precioBajo.length > 0);
            }
            if (tbodySR) {
                tbodySR.innerHTML = sinReceta.map(it => `
                    <tr>
                        <td>${escapeHtml(it.nombre)}</td>
                        <td>${escapeHtml(it.codigo)}</td>
                        <td><a href="/productos" class="btn btn-sm btn-outline-primary">Ir a Productos</a></td>
                    </tr>`).join('');
                if (vacioSR) vacioSR.classList.toggle('d-none', sinReceta.length > 0);
            }
            loadingEl.classList.add('d-none');
            contentEl.classList.remove('d-none');
        }).catch(() => {
            loadingEl.classList.add('d-none');
            contentEl.classList.remove('d-none');
            showToast('Error al cargar alertas', 'danger');
        });
    }
    document.getElementById('alertas-tab')?.addEventListener('shown.bs.tab', () => loadAlertas());

    // --- Configuración costeo ---
    function toggleConfigRows(metodo) {
        const m = metodo || document.getElementById('configMetodo')?.value || 'porcentaje';
        document.getElementById('rowPorcentaje')?.classList.toggle('d-none', m !== 'porcentaje');
        document.getElementById('rowCostoFijo')?.classList.toggle('d-none', m !== 'costo_fijo');
        document.getElementById('rowFactor')?.classList.toggle('d-none', m !== 'factor');
    }

    function loadConfig() {
        return api('/api/costeo/config').then(config => {
            const metodo = document.getElementById('configMetodo');
            if (metodo) metodo.value = config.metodo_indirectos || 'porcentaje';
            const pct = document.getElementById('configPorcentaje');
            if (pct) pct.value = config.porcentaje_indirectos ?? 10;
            const costoFijo = document.getElementById('configCostoFijo');
            if (costoFijo) costoFijo.value = config.costo_fijo_mensual ?? 0;
            const platosMes = document.getElementById('configPlatosMes');
            if (platosMes) platosMes.value = config.platos_estimados_mes ?? 500;
            const factor = document.getElementById('configFactor');
            if (factor) factor.value = config.factor_carga ?? 2.5;
            const margen = document.getElementById('configMargen');
            if (margen) margen.value = config.margen_objetivo_default ?? 65;
            const margenMinimo = document.getElementById('configMargenMinimoAlerta');
            if (margenMinimo) margenMinimo.value = config.margen_minimo_alerta ?? 30;
            toggleConfigRows(config.metodo_indirectos);
            return config;
        });
    }

    document.getElementById('configMetodo')?.addEventListener('change', (e) => toggleConfigRows(e.target.value));

    document.getElementById('formConfigCosteo')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            metodo_indirectos: document.getElementById('configMetodo')?.value || 'porcentaje',
            porcentaje_indirectos: parseFloat(document.getElementById('configPorcentaje')?.value) || 10,
            costo_fijo_mensual: parseFloat(document.getElementById('configCostoFijo')?.value) || 0,
            platos_estimados_mes: parseInt(document.getElementById('configPlatosMes')?.value, 10) || 500,
            factor_carga: parseFloat(document.getElementById('configFactor')?.value) || 2.5,
            margen_objetivo_default: parseFloat(document.getElementById('configMargen')?.value) || 65,
            margen_minimo_alerta: parseFloat(document.getElementById('configMargenMinimoAlerta')?.value) || 30
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
