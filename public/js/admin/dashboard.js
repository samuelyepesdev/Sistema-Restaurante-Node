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

    // Helper for rgba
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) :
            '28, 200, 138';
    }

    if (typeof chartData !== 'undefined') {
        const ctxVentas = document.getElementById('chartVentasMes');
        createLineChart(ctxVentas, chartData.ventasDiarias, 'Ventas Diarias ($)', '#1cc88a');

        const ctxVentasAnt = document.getElementById('chartVentasMesAnterior');
        createLineChart(ctxVentasAnt, chartData.ventasDiariasAnt, 'Ventas Diarias Ant. ($)', '#858796');
    }
});
