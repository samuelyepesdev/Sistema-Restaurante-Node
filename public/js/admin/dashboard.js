/**
 * Lógica de gráficos para el dashboard de superadministrador.
 */

document.addEventListener('DOMContentLoaded', function () {
    // Gráfico de Ventas del Mes (Diarias)
    function createLineChart(ctx, dataArray, label, colorHex) {
        if (!ctx || !dataArray) return;
        const labels = dataArray.map(v => {
            const date = new Date(v.fecha + 'T12:00:00');
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        });
        const values = dataArray.map(v => v.total);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: values,
                    borderColor: colorHex,
                    backgroundColor: `rgba(${hexToRgb(colorHex)}, 0.1)`,
                    pointRadius: 4,
                    pointBackgroundColor: colorHex,
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: colorHex, // simple hover
                    pointHoverBorderColor: '#fff',
                    pointHitRadius: 10,
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "rgb(255,255,255)",
                        bodyColor: "#858796",
                        titleColor: "#6e707e",
                        borderColor: '#dddfeb',
                        borderWidth: 1,
                        xPadding: 15,
                        yPadding: 15,
                        displayColors: false,
                        caretPadding: 10,
                        callbacks: {
                            label: function (context) {
                                return new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    minimumFractionDigits: 0
                                }).format(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgb(234, 236, 244)",
                            zeroLineColor: "rgb(234, 236, 244)",
                            drawBorder: false,
                            borderDash: [2],
                            zeroLineBorderDash: [2]
                        },
                        ticks: {
                            padding: 10,
                            callback: function (value) {
                                return new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico Multi-Serie para Ventas por Tenant
    function createMultiLineChart(ctx, tenantDataArray) {
        if (!ctx) return;

        let labels = [];
        if (tenantDataArray && tenantDataArray.length > 0) {
            const firstTenant = tenantDataArray[0];
            labels = firstTenant.data.map(v => {
                const date = new Date(v.fecha + 'T12:00:00');
                return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            });
        } else {
            // Generar labels vacíos para el mes actual si no hay datos
            const now = new Date();
            const diaHoy = now.getDate();
            for (let i = 1; i <= diaHoy; i++) {
                labels.push(`${String(i).padStart(2, '0')} mar`);
            }
        }

        // Colores predefinidos
        const palette = [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
            '#fd7e14', '#6f42c1', '#e83e8c', '#20c997', '#17a2b8'
        ];

        const datasets = tenantDataArray.map((t, idx) => {
            const color = palette[idx % palette.length];
            return {
                label: t.nombre,
                data: t.data.map(v => v.total),
                borderColor: color,
                backgroundColor: `rgba(${hexToRgb(color)}, 0.05)`,
                pointRadius: 3,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointHoverRadius: 5,
                lineTension: 0.3,
                fill: false
            };
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 15 }
                    },
                    tooltip: {
                        backgroundColor: "rgb(255,255,255)",
                        bodyColor: "#858796",
                        titleColor: "#6e707e",
                        borderColor: '#dddfeb',
                        borderWidth: 1,
                        xPadding: 15,
                        yPadding: 15,
                        displayColors: true,
                        caretPadding: 10,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('es-CO', {
                                        style: 'currency',
                                        currency: 'COP',
                                        minimumFractionDigits: 0
                                    }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // Helper for rgba
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) :
            '78, 115, 223';
    }

    if (typeof chartData !== 'undefined') {
        console.log('Admin Dashboard: chartData detectado', chartData);

        const ctxTenants = document.getElementById('chartVentasTenants');
        if (ctxTenants) {
            console.log('Iniciando chartVentasTenants...');
            createMultiLineChart(ctxTenants, chartData.ventasPorTenant);
        } else {
            console.warn('No se encontró el canvas chartVentasTenants');
        }

        const ctxVentas = document.getElementById('chartVentasMes');
        if (ctxVentas) {
            console.log('Iniciando chartVentasMes...');
            createLineChart(ctxVentas, chartData.ventasDiarias, 'Ventas Totales ($)', '#1cc88a');
        }

        const ctxVentasAnt = document.getElementById('chartVentasMesAnterior');
        if (ctxVentasAnt) {
            console.log('Iniciando chartVentasMesAnterior...');
            createLineChart(ctxVentasAnt, chartData.ventasDiariasAnt, 'Ventas Totales Ant. ($)', '#858796');
        }
    } else {
        console.error('chartData no está definido en el dashboard');
    }
});
