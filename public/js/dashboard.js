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
        updateMiniCalendarioEventos(stats.eventosCalendario || []);
        updateTopProductsByCategoryTable(stats.topProductsByCategory);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las estadísticas');
    }
}

/**
 * Update statistics cards
 */
function updateStatsCards(stats) {
    $('#totalSales').text(formatCurrency(stats.totalSales));
    $('#totalInvoices').text(stats.totalInvoices);
    
    const avgInvoice = stats.totalInvoices > 0 
        ? stats.totalSales / stats.totalInvoices 
        : 0;
    $('#avgInvoice').text(formatCurrency(avgInvoice));
    
    $('#uniqueProducts').text(stats.topProducts ? stats.topProducts.length : 0);
    $('#eventosCount').text(stats.eventos_count != null ? stats.eventos_count : 0);
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
 * Build map: dateStr (YYYY-MM-DD) -> array of event names for that day
 */
function fechasConEventoMap(eventos) {
    const map = new Map();
    (eventos || []).forEach(ev => {
        const ini = new Date(ev.fecha_inicio);
        const fin = new Date(ev.fecha_fin);
        const nombre = (ev.nombre || 'Evento').trim();
        for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().slice(0, 10);
            if (!map.has(key)) map.set(key, []);
            if (map.get(key).indexOf(nombre) === -1) map.get(key).push(nombre);
        }
    });
    return map;
}

/**
 * Render mini calendar: siempre mes actual, días con evento en rojo y tooltip con nombre(s)
 */
function updateMiniCalendarioEventos(eventosCalendario) {
    const container = document.getElementById('miniCalendarioEventos');
    if (!container) return;

    const eventosMap = fechasConEventoMap(eventosCalendario);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const hoy = now.toISOString().slice(0, 10);

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDay = first.getDay();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let html = '<div class="mes-titulo">' + monthNames[month] + ' ' + year + '</div>';
    html += '<table class="mini-calendario table table-bordered mb-0"><thead><tr>';
    html += '<th>Do</th><th>Lu</th><th>Ma</th><th>Mi</th><th>Ju</th><th>Vi</th><th>Sá</th></tr></thead><tbody><tr>';

    for (let i = 0; i < startDay; i++) html += '<td></td>';
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
        if ((startDay + day) % 7 === 0 && day < daysInMonth) html += '</tr><tr>';
    }
    html += '</tr></tbody></table>';
    container.innerHTML = html;

    var tooltipTriggerList = container.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(function (el) {
        new bootstrap.Tooltip(el, { trigger: 'hover click' });
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
});

