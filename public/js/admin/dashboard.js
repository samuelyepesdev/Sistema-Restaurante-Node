/**
 * Lógica de gráficos para el dashboard de superadministrador.
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Gráfico de Crecimiento (Líneas)
    const ctxCrecimiento = document.getElementById('chartCrecimiento');
    if (ctxCrecimiento && chartData && chartData.historico) {
        const labels = chartData.historico.map(h => h.mes);
        const values = chartData.historico.map(h => h.cantidad);

        new Chart(ctxCrecimiento, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nuevos Restaurantes',
                    data: values,
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    pointRadius: 3,
                    pointBackgroundColor: '#4e73df',
                    pointBorderColor: '#4e73df',
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#4e73df',
                    pointHoverBorderColor: '#4e73df',
                    pointHitRadius: 10,
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }

    // 2. Gráfico de Planes (Dona)
    const ctxPlanes = document.getElementById('chartPlanes');
    if (ctxPlanes && chartData && chartData.porPlan) {
        const labels = chartData.porPlan.map(p => p.plan_nombre);
        const values = chartData.porPlan.map(p => p.cantidad);

        // Colores premium
        const colors = [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
            '#858796', '#5a5c69', '#6610f2', '#6f42c1', '#e83e8c'
        ];

        new Chart(ctxPlanes, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    hoverBackgroundColor: colors.map(c => c + 'CC').slice(0, labels.length),
                    hoverBorderColor: "rgba(234, 236, 244, 1)",
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgb(255,255,255)",
                        bodyColor: "#858796",
                        borderColor: '#dddfeb',
                        borderWidth: 1,
                        xPadding: 15,
                        yPadding: 15,
                        displayColors: false,
                        caretPadding: 10,
                    }
                },
                cutout: '70%',
            }
        });
    }
});
