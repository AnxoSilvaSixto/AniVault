```dataviewjs
// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    folder: '"Anime"',
    field: 'Rating',
    barColor: '#889eaa',
    curveColor: '#ff6b6b',
    meanLineColor: '#2ecc71',
    textColor: '#888'
};

// ========================================
// HELPER FUNCTIONS
// ========================================
function calculateMedian(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
}

function calculateMode(numbers) {
    const frequency = {};
    let maxFreq = 0;
    let modes = [];
    
    numbers.forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
        if (frequency[num] > maxFreq) {
            maxFreq = frequency[num];
            modes = [num];
        } else if (frequency[num] === maxFreq) {
            modes.push(num);
        }
    });
    
    return modes.length === numbers.length ? [] : modes;
}

// ========================================
// DATA COLLECTION
// ========================================
const pages = dv.pages(CONFIG.folder).where(p => p[CONFIG.field] != null);
const totalCount = pages.length;

if (totalCount === 0) {
    dv.paragraph("No rated anime found.");
} else {
    const ratingsArray = pages.array().map(p => p[CONFIG.field]);
    
    // ========================================
    // STATISTICS CALCULATION
    // ========================================
    const mean = ratingsArray.reduce((a, b) => a + b, 0) / totalCount;
    const median = calculateMedian(ratingsArray);
    const modes = calculateMode(ratingsArray);
    
    // Distribution counts
    const ratingCounts = {};
    for (let i = 0; i <= 10; i++) ratingCounts[i] = 0;
    ratingsArray.forEach(r => { 
        if (ratingCounts.hasOwnProperty(r)) ratingCounts[r]++; 
    });
    
    // Find most common rating
    let mostCommonRating = 0;
    let highestCount = 0;
    for (let i = 0; i <= 10; i++) {
        if (ratingCounts[i] > highestCount) {
            highestCount = ratingCounts[i];
            mostCommonRating = i;
        }
    }
    
    // Variance and standard deviation
    const variance = ratingsArray.reduce((sq, r) => sq + Math.pow(r - mean, 2), 0) / totalCount;
    const sd = Math.sqrt(variance);
    
    // ========================================
    // CHART DATA PREPARATION
    // ========================================
    const labels = Object.keys(ratingCounts);
    const barData = Object.values(ratingCounts);

    // Generate normal distribution curve
    const curvePoints = [];
    const step = 0.1;
    for (let x = 0; x <= 10; x += step) {
        const exponent = sd > 0 ? -0.5 * Math.pow((x - mean) / sd, 2) : 0;
        const pdf = sd > 0 ? (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent) : 1;
        const scaledValue = pdf * totalCount;
        curvePoints.push({ x: x, y: scaledValue });
    }

    // ========================================
    // MEAN LINE PLUGIN
    // ========================================
    const meanLinePlugin = {
        id: 'meanLinePlugin',
        afterDraw(chart) {
            const ctx = chart.ctx;
            const xAxis = chart.scales['x'];
            const yAxis = chart.scales['y'];
            
            const categoryIndex = mean;
            const xPixel = xAxis.getPixelForValue(labels[Math.round(categoryIndex)]);

            ctx.save();
            ctx.strokeStyle = CONFIG.meanLineColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(xPixel, yAxis.top);
            ctx.lineTo(xPixel, yAxis.bottom);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = CONFIG.meanLineColor;
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Mean: ${mean.toFixed(2)}`, xPixel, yAxis.top - 10);
        }
    };

    // ========================================
    // CHART CONFIGURATION
    // ========================================
    const chartData = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Number of Anime',
                    data: barData,
                    backgroundColor: CONFIG.barColor,
                    borderColor: CONFIG.barColor,
                    borderWidth: 1,
                    xAxisID: 'x',
                    order: 2
                },
                {
                    label: 'Normal Distribution',
                    data: curvePoints,
                    type: 'line',
                    borderColor: CONFIG.curveColor,
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4,
                    xAxisID: 'x2',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: CONFIG.textColor }
                },
                title: {
                    display: true,
                    text: `Anime Rating Distribution (${totalCount} rated titles)`,
                    color: CONFIG.textColor,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.datasetIndex === 0) {
                                return `Count: ${context.parsed.y} anime`;
                            } else {
                                return `Theoretical frequency: ${context.parsed.y.toFixed(1)}`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1, 
                        color: CONFIG.textColor,
                        callback: function(value) {
                            if (value % 1 === 0) return value;
                            return '';
                        }
                    },
                    grid: { 
                        color: 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'Number of Anime',
                        color: CONFIG.textColor
                    }
                },
                x: {
                    type: 'category',
                    position: 'bottom',
                    ticks: { 
                        color: CONFIG.textColor,
                        callback: function(value, index) {
                            return this.getLabelForValue(value);
                        }
                    },
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'Rating',
                        color: CONFIG.textColor
                    }
                },
                x2: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 10,
                    display: false,
                    grid: { display: false }
                }
            }
        },
        plugins: [meanLinePlugin]
    };

    // ========================================
    // RENDER CHART
    // ========================================
    const container = this.container.createEl('div');
    container.style.height = '600px';
    container.style.width = '100%';
    window.renderChart(chartData, container);
    
    // ========================================
    // STATISTICS SUMMARY
    // ========================================
    const summaryText = `
# 📊 Rating Statistics Summary

**Total Rated Titles:** ${totalCount}  
**Average (Mean) Rating:** ${mean.toFixed(2)}  
**Median Rating:** ${median.toFixed(2)}  
**Most Common Rating:** ${mostCommonRating} (${highestCount} titles)  
**Standard Deviation:** ${sd.toFixed(2)}  

## Distribution Insights:
- **${((ratingCounts[5] + ratingCounts[6] + ratingCounts[7] + ratingCounts[8]) / totalCount * 100).toFixed(1)}%** of your ratings are between 5-8 (the "enjoyable" range)
- Only **${((ratingCounts[0] + ratingCounts[1] + ratingCounts[2] + ratingCounts[9] + ratingCounts[10]) / totalCount * 100).toFixed(1)}%** are at the extremes (0-2 or 9-10)
- Your ratings show a **${mean > median ? 'positive' : 'negative'} skew** (mean ${mean > median ? '>' : '<'} median)

> *Based on ${totalCount} completed anime.*
`;
    
    dv.paragraph(summaryText);
}
```
