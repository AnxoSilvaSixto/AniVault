```dataviewjs
// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    folder: '"Anime"',
    property: "Studio",
    topN: 10,
    minPercentForLabel: 7,
    includeOthers: true
};

const COLORS = [
    { bg: 'rgba(255, 99, 132, 0.8)', border: 'rgba(255, 99, 132, 1)' },
    { bg: 'rgba(54, 162, 235, 0.8)', border: 'rgba(54, 162, 235, 1)' },
    { bg: 'rgba(255, 206, 86, 0.8)', border: 'rgba(255, 206, 86, 1)' },
    { bg: 'rgba(75, 192, 192, 0.8)', border: 'rgba(75, 192, 192, 1)' },
    { bg: 'rgba(153, 102, 255, 0.8)', border: 'rgba(153, 102, 255, 1)' },
    { bg: 'rgba(255, 159, 64, 0.8)', border: 'rgba(255, 159, 64, 1)' },
    { bg: 'rgba(199, 199, 199, 0.8)', border: 'rgba(199, 199, 199, 1)' },
    { bg: 'rgba(83, 102, 255, 0.8)', border: 'rgba(83, 102, 255, 1)' },
    { bg: 'rgba(255, 99, 255, 0.8)', border: 'rgba(255, 99, 255, 1)' },
    { bg: 'rgba(99, 255, 132, 0.8)', border: 'rgba(99, 255, 132, 1)' }
];

const OTHERS_COLOR = { bg: 'rgba(150, 150, 150, 0.8)', border: 'rgba(150, 150, 150, 1)' };

// ========================================
// DATA COLLECTION
// ========================================
const pages = dv.pages(CONFIG.folder);
const counts = {};

pages.forEach(page => {
    const rawProperty = page[CONFIG.property];
    if (!rawProperty) return;
    
    const properties = Array.isArray(rawProperty) ? rawProperty : [rawProperty];
    properties.forEach(value => {
        let cleanName = dv.func.string(value)
            .replace(/[\[\]]/g, "")
            .trim();
        
        if (cleanName.includes('|')) {
            cleanName = cleanName.split('|').pop().trim();
        }

        if (cleanName) {
            counts[cleanName] = (counts[cleanName] || 0) + 1;
        }
    });
});

// ========================================
// DATA PROCESSING
// ========================================
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
const totalUnique = sorted.length;
const topItems = sorted.slice(0, CONFIG.topN);
const remainingItems = sorted.slice(CONFIG.topN);
const othersCount = remainingItems.reduce((sum, item) => sum + item[1], 0);

// Build chart data
let labels = topItems.map(item => item[0]);
let values = topItems.map(item => item[1]);

if (CONFIG.includeOthers && othersCount > 0) {
    labels.push(`Others (${remainingItems.length} items)`);
    values.push(othersCount);
}

const totalDisplayed = values.reduce((sum, val) => sum + val, 0);

let backgroundColors = topItems.map((_, i) => COLORS[i % COLORS.length].bg);
let borderColors = topItems.map((_, i) => COLORS[i % COLORS.length].border);

if (CONFIG.includeOthers && othersCount > 0) {
    backgroundColors.push(OTHERS_COLOR.bg);
    borderColors.push(OTHERS_COLOR.border);
}

// ========================================
// CHART CONFIGURATION
// ========================================
const chartData = {
    type: 'doughnut',
    data: {
        labels: labels,
        datasets: [{
            data: values,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        layout: { 
            padding: { 
                top: 25, 
                bottom: 25, 
                left: 25, 
                right: 0 
            } 
        },
        plugins: {
            legend: { 
                display: true, 
                position: 'right',
                align: 'center',
                labels: {
                    padding: 10,
                    font: { 
                        size: 15, 
                        family: 'system-ui, -apple-system, sans-serif' 
                    },
                    boxWidth: 15,
                    boxHeight: 15,
                    generateLabels: (chart) => {
                        return chart.data.labels.map((label, i) => ({
                            text: `${label} (${chart.data.datasets[0].data[i]})`,
                            fillStyle: chart.data.datasets[0].backgroundColor[i],
                            hidden: !chart.getDataVisibility(i),
                            index: i
                        }));
                    }
                }
            },
            title: { 
                display: true, 
                text: `Top ${CONFIG.topN} Studios (${totalUnique} total)`,
                font: { 
                    size: 18, 
                    weight: 'bold', 
                    family: 'system-ui, -apple-system, sans-serif' 
                },
                padding: { 
                    top: 10, 
                    bottom: 20 
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed;
                        const percent = ((value / totalDisplayed) * 100).toFixed(1);
                        return `${context.label}: ${value} (${percent}%)`;
                    },
                    afterLabel: (context) => {
                        if (context.label.startsWith('Others') && remainingItems.length > 0) {
                            const breakdown = remainingItems.slice(0, 5).map(item => `  ${item[0]}: ${item[1]}`);
                            if (remainingItems.length > 5) {
                                breakdown.push(`  ... and ${remainingItems.length - 5} more`);
                            }
                            return breakdown;
                        }
                        return '';
                    }
                }
            }
        },
        animation: {
            animateRotate: true,
            animateScale: true,
            onComplete: function () {
                const chart = this;
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                
                ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                
                meta.data.forEach((element, index) => {
                    const percent = ((values[index] / totalDisplayed) * 100).toFixed(1);
                    if (percent > CONFIG.minPercentForLabel) {
                        const position = element.tooltipPosition();
                        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                        ctx.shadowBlur = 4;
                        ctx.fillText(`${percent}%`, position.x, position.y);
                        ctx.shadowBlur = 0;
                    }
                });
            }
        }
    }
};

// ========================================
// RENDER CHART
// ========================================
const chartContainer = this.container.createEl('div');
chartContainer.style.height = '500px'; 
chartContainer.style.position = 'relative';
chartContainer.style.padding = '10px';
chartContainer.style.maxWidth = '490px';
chartContainer.style.margin = '0 auto';

window.renderChart(chartData, chartContainer);
```
