/**
 * Dashboard JavaScript - Handles dashboard charts and statistics
 * Related to: views/dashboard.ejs, routes/dashboard.js
 */

// Chart instances
let dailySalesChart = null;
let ventasEnEventosChart = null;
let salesByCategoryChart = null;
let topProductsChart = null;

/**
 * Format number as currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Load dashboard statistics
 */
async function loadStats(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.desde) params.append('desde', filters.desde);
        if (filters.hasta) params.append('hasta', filters.hasta);

        const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
        if (!response.ok) throw new Error('Error al cargar estadísticas');

        const stats = await response.json();
        updateStatsCards(stats);
        updateCharts(stats);
        var eventosMes = stats.eventosCalendario || [];
        if (!Array.isArray(eventosMes)) eventosMes = [];
        var now = new Date();
        calendarEventosCache[getMesKey(now.getFullYear(), now.getMonth())] = eventosMes;
        updateMiniCalendarioEventos(eventosMes, null, null);
        updateTopProductsByCategoryTable(stats.topProductsByCategory);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las estadísticas');
    }
}

/** Últimas estadísticas cargadas (para modales al hacer clic en cards) */
let lastStats = null;

/**
 * Update statistics cards
 */
function updateStatsCards(stats) {
    lastStats = stats;
    $('#totalSales').text(formatCurrency(stats.totalSales));
    $('#totalInvoices').text(stats.totalInvoices);
    
    const avgInvoice = stats.totalInvoices > 0 
        ? stats.totalSales / stats.totalInvoices 
        : 0;
    $('#avgInvoice').text(formatCurrency(avgInvoice));
    
    if (stats.topProducts && $('#uniqueProducts').length) $('#uniqueProducts').text(stats.topProducts.length);
    // Eventos del mes = cantidad del mes que muestra el calendario (al cargar = mes actual)
    const eventosDelMes = (stats.eventosCalendario || []).length;
    $('#eventosCount').text(eventosDelMes);
    $('#ventasEventosTotal').text(formatCurrency(stats.ventas_eventos_total != null ? stats.ventas_eventos_total : 0));
}

/**
 * Update all charts
 */
function updateCharts(stats) {
    updateDailySalesChart(stats.dailySales);
    updateVentasEnEventosChart(stats.ventasPorEvento || []);
    updateSalesByCategoryChart(stats.salesByCategory);
    updateTopProductsChart(stats.topProducts);
}

/**
 * Update daily sales chart
 */
function updateDailySalesChart(data) {
    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    
    if (dailySalesChart) {
        dailySalesChart.destroy();
    }

    dailySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.fecha);
                return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            }),
            datasets: [{
                label: 'Ventas ($)',
                data: data.map(d => d.total_ventas),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update ventas en eventos chart (bar by event)
 */
function updateVentasEnEventosChart(data) {
    const ctx = document.getElementById('ventasEnEventosChart');
    if (!ctx) return;

    if (ventasEnEventosChart) {
        ventasEnEventosChart.destroy();
    }

    const labels = (data && data.length > 0)
        ? data.map(d => (d.evento_nombre || '').length > 18 ? (d.evento_nombre || '').substring(0, 18) + '…' : (d.evento_nombre || ''))
        : ['Sin ventas en eventos'];
    const values = (data && data.length > 0) ? data.map(d => d.total_ventas) : [0];

    ventasEnEventosChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas ($)',
                data: values,
                backgroundColor: 'rgba(253, 126, 20, 0.8)',
                borderColor: 'rgba(229, 89, 12, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: ' + formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: value => formatCurrency(value) }
                }
            }
        }
    });
}

/**
 * Parsea fecha YYYY-MM-DD, ISO o Date como fecha local (evita que la zona horaria cambie el día).
 */
function parseFechaLocal(str) {
    if (str == null) return null;
    if (typeof str === 'object' && str instanceof Date) {
        return new Date(str.getFullYear(), str.getMonth(), str.getDate());
    }
    var s = String(str).trim();
    if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
        var y = parseInt(s.slice(0, 4), 10);
        var m = parseInt(s.slice(5, 7), 10) - 1;
        var d = parseInt(s.slice(8, 10), 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
    var d2 = new Date(str);
    return isNaN(d2.getTime()) ? null : new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
}

/**
 * Fecha a clave YYYY-MM-DD en local.
 */
function dateToKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

/**
 * Build map: dateStr (YYYY-MM-DD) -> array of event names for that day (usa fechas locales para que marzo y otros meses marquen bien).
 */
function fechasConEventoMap(eventos) {
    const map = new Map();
    (eventos || []).forEach(ev => {
        const ini = parseFechaLocal(ev.fecha_inicio);
        const fin = parseFechaLocal(ev.fecha_fin);
        if (!ini || !fin) return;
        const nombre = (ev.nombre || 'Evento').trim();
        for (let d = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate()); d <= fin; d.setDate(d.getDate() + 1)) {
            const key = dateToKey(d);
            if (!map.has(key)) map.set(key, []);
            if (map.get(key).indexOf(nombre) === -1) map.get(key).push(nombre);
        }
    });
    return map;
}

/** Mes mostrado en el calendario (para navegación) */
var calendarViewYear = new Date().getFullYear();
var calendarViewMonth = new Date().getMonth();

/** Caché de eventos por mes (YYYY-MM) para que al volver con las flechas no se pierdan los eventos */
var calendarEventosCache = {};

/**
 * Obtiene la clave del mes (YYYY-MM)
 */
function getMesKey(year, month) {
    return year + '-' + String(month + 1).padStart(2, '0');
}

/**
 * Fetch events for a given month and update calendar (usa caché si ya tenemos datos del mes)
 */
function fetchCalendarMonth(year, month) {
    const mesParam = getMesKey(year, month);
    if (calendarEventosCache[mesParam] !== undefined) {
        updateMiniCalendarioEventos(calendarEventosCache[mesParam], year, month);
        return;
    }
    fetch('/api/dashboard/eventos-calendario?mes=' + mesParam, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Error al cargar eventos')); })
        .then(function (data) {
            var list = data.eventosCalendario || data.eventos || [];
            if (!Array.isArray(list)) list = [];
            calendarEventosCache[mesParam] = list;
            updateMiniCalendarioEventos(list, year, month);
        })
        .catch(function () {
            updateMiniCalendarioEventos([], year, month);
        });
}

/**
 * Render mini calendar with optional year/month and nav (prev/next)
 */
function updateMiniCalendarioEventos(eventosCalendario, year, month) {
    const container = document.getElementById('miniCalendarioEventos');
    if (!container) return;

    if (!Array.isArray(eventosCalendario)) eventosCalendario = [];
    const now = new Date();
    if (year == null) year = now.getFullYear();
    if (month == null) month = now.getMonth();
    calendarViewYear = year;
    calendarViewMonth = month;

    const eventosMap = fechasConEventoMap(eventosCalendario);
    const hoy = dateToKey(now);

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDay = first.getDay();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let html = '<div class="mini-calendario-nav">';
    html += '<button type="button" class="btn btn-outline-secondary btn-sm" id="calPrevMonth" title="Mes anterior"><i class="bi bi-chevron-left"></i></button>';
    html += '<span class="mes-titulo">' + monthNames[month] + ' ' + year + '</span>';
    html += '<button type="button" class="btn btn-outline-secondary btn-sm" id="calNextMonth" title="Mes siguiente"><i class="bi bi-chevron-right"></i></button>';
    html += '</div>';
    html += '<table class="mini-calendario table table-bordered mb-0"><thead><tr>';
    html += '<th>Do</th><th>Lu</th><th>Ma</th><th>Mi</th><th>Ju</th><th>Vi</th><th>Sá</th></tr></thead><tbody><tr>';

    for (let i = 0; i < startDay; i++) html += '<td></td>';
    let cellCount = startDay;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const nombres = eventosMap.get(dateStr) || [];
        const hasEvent = nombres.length > 0;
        const isToday = dateStr === hoy;
        let cls = '';
        if (hasEvent) cls += ' dia-evento';
        if (isToday) cls += ' dia-hoy';
        const titulo = hasEvent ? ('Evento' + (nombres.length > 1 ? 's' : '') + ': ' + nombres.join(', ')) : '';
        const attrTooltip = titulo ? ' data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="' + titulo.replace(/"/g, '&quot;') + '" title="' + titulo.replace(/"/g, '&quot;') + '"' : '';
        html += '<td class="' + cls.trim() + '"' + attrTooltip + '>' + day + '</td>';
        cellCount++;
        if (cellCount % 7 === 0 && day < daysInMonth) html += '</tr><tr>';
    }
    var rest = 7 - (cellCount % 7);
    if (rest < 7) for (let i = 0; i < rest; i++) html += '<td></td>';
    html += '</tr></tbody></table>';
    container.innerHTML = html;

    var tooltipTriggerList = container.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(function (el) {
        new bootstrap.Tooltip(el, { trigger: 'hover click' });
    });

    document.getElementById('calPrevMonth').addEventListener('click', function () {
        var m = calendarViewMonth - 1;
        var y = calendarViewYear;
        if (m < 0) { m = 11; y--; }
        fetchCalendarMonth(y, m);
    });
    document.getElementById('calNextMonth').addEventListener('click', function () {
        var m = calendarViewMonth + 1;
        var y = calendarViewYear;
        if (m > 11) { m = 0; y++; }
        fetchCalendarMonth(y, m);
    });
}

/**
 * Update sales by category chart
 */
function updateSalesByCategoryChart(data) {
    const ctx = document.getElementById('salesByCategoryChart').getContext('2d');
    
    if (salesByCategoryChart) {
        salesByCategoryChart.destroy();
    }

    salesByCategoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.categoria_nombre),
            datasets: [{
                label: 'Ventas ($)',
                data: data.map(d => d.total_ventas),
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update top products chart
 */
function updateTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    if (topProductsChart) {
        topProductsChart.destroy();
    }

    // Limit to top 10 for better visualization
    const top10 = data.slice(0, 10);

    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(p => p.nombre.length > 20 ? p.nombre.substring(0, 20) + '...' : p.nombre),
            datasets: [{
                label: 'Ventas ($)',
                data: top10.map(p => p.total_ventas),
                backgroundColor: 'rgba(153, 102, 255, 0.8)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: ' + formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update top products by category table
 */
function updateTopProductsByCategoryTable(data) {
    if (!data || data.length === 0) {
        $('#topProductsByCategoryTable').html('<p class="text-muted">No hay datos disponibles</p>');
        return;
    }

    let html = '';
    data.forEach(categoria => {
        if (categoria.productos && categoria.productos.length > 0) {
            html += `
                <div class="mb-4">
                    <h5 class="mb-3">
                        <i class="bi bi-tag-fill me-2"></i>
                        ${categoria.categoria_nombre}
                    </h5>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>Producto</th>
                                    <th>Código</th>
                                    <th class="text-end">Cantidad Vendida</th>
                                    <th class="text-end">Total Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            categoria.productos.forEach(producto => {
                html += `
                    <tr>
                        <td>${producto.producto_nombre}</td>
                        <td><span class="badge bg-secondary">${producto.codigo}</span></td>
                        <td class="text-end">${producto.total_cantidad.toFixed(2)}</td>
                        <td class="text-end"><strong>${formatCurrency(producto.total_ventas)}</strong></td>
                    </tr>
                `;
            });
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    });

    $('#topProductsByCategoryTable').html(html || '<p class="text-muted">No hay datos disponibles</p>');
}

/**
 * Apply date filters
 */
function applyFilters() {
    const desde = $('#filtroDesde').val();
    const hasta = $('#filtroHasta').val();
    
    const filters = {};
    if (desde) filters.desde = desde;
    if (hasta) filters.hasta = hasta;
    
    loadStats(filters);
}

/**
 * Clear filters
 */
function clearFilters() {
    $('#filtroDesde').val('');
    $('#filtroHasta').val('');
    loadStats({});
}

/**
 * Cards clicables: ir a Ventas/Eventos o mostrar modal con detalle
 */
function initStatsCardClicks() {
    $(document).on('click', '.stat-card.clickable[data-action="go-ventas"]', function() {
        window.location.href = '/ventas';
    });
    $(document).on('click', '.stat-card.clickable[data-action="go-eventos"]', function() {
        window.location.href = '/eventos';
    });
    $(document).on('click', '.stat-card.clickable[data-action="modal-promedio"]', function() {
        if (!lastStats) return;
        var total = lastStats.totalSales != null ? lastStats.totalSales : 0;
        var cant = lastStats.totalInvoices != null ? lastStats.totalInvoices : 0;
        var avg = cant > 0 ? total / cant : 0;
        $('#modalPromedioTotal').text(formatCurrency(total));
        $('#modalPromedioCantidad').text(cant);
        $('#modalPromedioValor').text(formatCurrency(avg));
        $('#modalPromedioFormula').text('Total ventas ÷ Cantidad de facturas = ' + formatCurrency(avg));
        var modalEl = document.getElementById('modalDetallePromedio');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });
    $(document).on('click', '.stat-card.clickable[data-action="modal-ventas-eventos"]', function() {
        if (!lastStats) return;
        var total = lastStats.ventas_eventos_total != null ? lastStats.ventas_eventos_total : 0;
        var cant = lastStats.ventas_eventos_cantidad != null ? lastStats.ventas_eventos_cantidad : 0;
        $('#modalVentasEventosTotal').text(formatCurrency(total));
        $('#modalVentasEventosCantidad').text(cant);
        var modalEl = document.getElementById('modalDetalleVentasEventos');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });
}

// Initialize on page load
$(document).ready(function() {
    // Set default date range (last 30 days)
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    
    $('#filtroDesde').val(desde.toISOString().split('T')[0]);
    $('#filtroHasta').val(hasta.toISOString().split('T')[0]);
    
    // Load initial stats
    loadStats({
        desde: desde.toISOString().split('T')[0],
        hasta: hasta.toISOString().split('T')[0]
    });
    
    // Event handlers
    $('#aplicarFiltros').on('click', applyFilters);
    $('#limpiarFiltros').on('click', clearFilters);
    initStatsCardClicks();
});

