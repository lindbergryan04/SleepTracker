import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://unpkg.com/scrollama?module';

// Initialize scrollama
const scroller = scrollama();
let pcpAnimated = false; // Flag to ensure PCP animation runs only once

// Function to animate PCP lines
function animatePCPLines(paths) {
    paths.transition()
        .duration(1000) // Animation duration in ms
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
}

// Function to handle step enter
function handleStepEnter(response) {
    // response.element: the DOM element that triggered the event
    // response.index: the index of the step
    // response.direction: 'up' or 'down'
    response.element.style.opacity = 1;
    response.element.style.transform = 'translateY(0)';

    // Check if the entered element is the PCP container trigger
    if (response.element.id === 'pcp-scroll-trigger' && !pcpAnimated) {
        const svg = d3.select("#daily-activity-pcp-visualization-area svg");
        if (svg.node()) { // Check if svg exists
            const paths = svg.selectAll("path.pcp-user-line");
            if (!paths.empty()) {
                // animatePCPLines(paths); // No longer animating here
                pcpAnimated = true;
            }
        }
    }
}

// Function to handle step exit
function handleStepExit(response) {
    response.element.style.opacity = 0.2;
    response.element.style.transform = 'translateY(50px)';
}

// Setup scrollama
scroller
    .setup({
        step: '.module, .compact-scroll-module', // Specify the class of your scrollable elements
        offset: 0.5, // Trigger when the element is 50% in view
        // debug: true, // Uncomment to see helper lines
    })
    .onStepEnter(handleStepEnter)
    .onStepExit(handleStepExit);

// Optional: handle window resize
window.addEventListener('resize', scroller.resize);



const width = 1000;
const height = 600;


async function loadSleepData() { /* for line graph */
    const data = await d3.csv('data/clean_data/user_sleep_data.csv', (row) => ({
        user_id: Number(row.user_id),
        inBedDate: new Date(row['In Bed Date']),
        inBedTime: row['In Bed Time'],
        outBedDate: new Date(row['Out Bed Date']),
        outBedTime: row['Out Bed Time'],
        onsetDate: new Date(row['Onset Date']),
        onsetTime: row['Onset Time'],
        latency: Number(row.Latency),
        efficiency: Number(row.Efficiency),
        totalMinutesInBed: Number(row['Total Minutes in Bed']),
        totalSleepTime: Number(row['Total Sleep Time (TST)']),
        wakeAfterSleepOnset: Number(row['Wake After Sleep Onset (WASO)']),
        numberOfAwakenings: Number(row['Number of Awakenings']),
        averageAwakeningLength: Number(row['Average Awakening Length']),
        movementIndex: Number(row['Movement Index']),
        fragmentationIndex: Number(row['Fragmentation Index']),
        sleepFragmentationIndex: Number(row['Sleep Fragmentation Index']),
        gender: row.Gender,
        weight: Number(row.Weight),
        height: Number(row.Height),
        age: Number(row.Age)
    }));

    return data;
}

// ADDED: New function to load hormone data
async function loadHormoneData() {
    const data = await d3.csv('data/clean_data/user_sleep_data.csv', (row) => ({
        user_id: Number(row.user_id),
        cortisol: parseFloat(row.Cortisol_NORM),   // Changed back to parseFloat
        melatonin: parseFloat(row.Melatonin_NORM) // Changed back to parseFloat
    }));

    return data;
}

// Call loadSleepData and then render the chart
async function initIntroductoryMetricsChart() {
    const sleep_data = await loadSleepData();
    renderIntroductoryMetricsChart(sleep_data);
}

const introMetrics = [
    {
        key: 'efficiency',
        title: 'Sleep Efficiency',
        unit: '%',
        domain: [0, 100],
        description: 'This is the percentage of time you spend asleep while in bed. A higher efficiency means more consolidated, high-quality rest. An ideal score is typically 85% or higher.'
    },
    {
        key: 'totalSleepTime',
        title: 'Total Sleep Time (TST)',
        unit: 'minutes',
        domain: [0, 600], // Example domain, will adjust based on data
        description: 'This metric measures the total duration of actual sleep. While individual needs vary, adults generally require 7-9 hours (420-540 minutes) of sleep per night for optimal health.'
    },
    {
        key: 'wakeAfterSleepOnset',
        title: 'Wake After Sleep Onset (WASO)',
        unit: 'minutes',
        domain: [0, 120],
        description: 'WASO is the total time spent awake after you\'ve initially fallen asleep. Lower values are better, as they indicate more continuous, uninterrupted sleep.'
    },
    {
        key: 'numberOfAwakenings',
        title: 'Number of Awakenings',
        unit: '',
        domain: [0, 30],
        description: 'This counts how many times you wake up during the night after falling asleep. While brief awakenings are normal, frequent disruptions can prevent you from reaching deeper, more restorative sleep stages.'
    },
    {
        key: 'sleepFragmentationIndex',
        title: 'Sleep Fragmentation Index',
        unit: '',
        domain: [0, 50],
        description: 'This index quantifies how broken or interrupted your sleep is. It combines the number of awakenings and movements. A lower index points to more consolidated, higher-quality sleep.'
    },
    {
        key: 'movementIndex',
        title: 'Movement Index',
        unit: '',
        domain: [0, 40],
        description: 'This reflects the amount of physical movement during sleep. A lower index suggests more restful and less disturbed sleep.'
    }
];

let currentMetricIndex = 0;

function renderIntroductoryMetricsChart(sleep_data) {
    const filtered_sleep_data = sleep_data.filter(d => d.user_id !== 11);
    // 1. Process data to get averages
    const averagedData = {};
    introMetrics.forEach(metric => {
        const validData = filtered_sleep_data.map(d => d[metric.key]).filter(v => typeof v === 'number' && !isNaN(v));
        if (validData.length > 0) {
            averagedData[metric.key] = {
                avg: d3.mean(validData),
                min: d3.min(validData),
                max: d3.max(validData)
            };
        }
    });
    // As requested, logging the processed data to the console for inspection
    console.log("Averaged metric data:", averagedData);

    const container = d3.select('#intro-metric-vis');
    const titleEl = d3.select('#intro-metric-title');
    const descriptionEl = d3.select('#intro-metric-description');
    const counterEl = d3.select('#intro-metric-counter');
    const prevButton = d3.select('#intro-prev-button');
    const nextButton = d3.select('#intro-next-button');

    function updateView() {
        const metric = introMetrics[currentMetricIndex];
        const data = averagedData[metric.key];

        // Update text content
        let displayTitle = metric.title;
        if (metric.key === 'totalSleepTime') {
            displayTitle = 'Total Sleep Time (minutes)';
        } else if (metric.key === 'wakeAfterSleepOnset') {
            displayTitle = 'Wake After Sleep Onset (minutes)';
        }
        titleEl.text(displayTitle);
        descriptionEl.text(metric.description);
        counterEl.text(`${currentMetricIndex + 1} / ${introMetrics.length}`);

        // Update button states
        prevButton.property('disabled', currentMetricIndex === 0);
        nextButton.property('disabled', currentMetricIndex === introMetrics.length - 1);

        // Update visualization
        renderBeeswarmViz(container, filtered_sleep_data, metric);
    }

    function renderBeeswarmViz(selection, all_data, metricConfig) {
        selection.selectAll('*').remove(); // Clear previous viz
        
        d3.selectAll('.tooltip').remove(); // Clear any stray tooltips

        const metricKey = metricConfig.key;
        const metricData = all_data.map(d => ({
            value: d[metricKey],
            user_id: d.user_id
        })).filter(d => typeof d.value === 'number' && !isNaN(d.value));

        if (metricData.length === 0) {
            selection.html('<p>Data not available for this metric.</p>');
            return;
        }

        const width = 600;
        const height = 250;
        const margin = { top: 40, right: 50, bottom: 70, left: 50 };

        const svg = selection.append('svg')
            .attr('width', width)
            .attr('height', height);

        let domain = metricConfig.domain;
        if (metricConfig.key !== 'efficiency') {
            const extent = d3.extent(metricData, d => d.value);
            const padding = extent[0] === extent[1] ? extent[1] * 0.1 || 1 : (extent[1] - extent[0]) * 0.1;
            domain = [Math.max(0, extent[0] - padding), extent[1] + padding];
        }

        const xScale = d3.scaleLinear()
            .domain(domain)
            .range([margin.left, width - margin.right])
            .nice();

        const averageValue = d3.mean(metricData, d => d.value);

        const simulation = d3.forceSimulation(metricData)
            .force("x", d3.forceX(d => xScale(d.value)).strength(2))
            .force("y", d3.forceY(height / 2 - margin.bottom / 2).strength(0.1))
            .force("collide", d3.forceCollide(7))
            .stop();

        for (let i = 0; i < 150; ++i) simulation.tick();

        const metricsToReverse = ['wakeAfterSleepOnset', 'sleepFragmentationIndex', 'numberOfAwakenings', 'movementIndex'];
        const colorDomain = metricsToReverse.includes(metricKey) 
            ? [xScale.domain()[1], xScale.domain()[0]] 
            : xScale.domain();

        const colorScale = d3.scaleSequential(d3.interpolateCool).domain(colorDomain);

        const unitDisplay = metricConfig.unit === '%' ? '%' : (metricConfig.unit ? ' ' + metricConfig.unit : '');

        // Average Line
        svg.append("line")
            .attr("x1", xScale(averageValue))
            .attr("x2", xScale(averageValue))
            .attr("y1", height - margin.bottom)
            .attr("y2", margin.top)
            .attr("stroke", "#007bff")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0)
            .transition().duration(800).delay(700)
            .style("opacity", 1);

        // Average Text
        svg.append("text")
            .attr("x", xScale(averageValue))
            .attr("y", margin.top - 8)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "13px")
            .style("font-weight", "bold")
            .text(`Avg: ${averageValue.toFixed(1)}${unitDisplay}`)
            .style("opacity", 0)
            .transition().duration(800).delay(700)
            .style("opacity", 1);

        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const circles = svg.selectAll("circle")
            .data(metricData, d => d.user_id)
            .enter().append("circle")
            .attr("r", 0) // Start with radius 0 for entry animation
            .attr("cx", d => xScale(d.value))
            .attr("cy", d => d.y)
            .attr("fill", d => colorScale(d.value))
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .on('mouseover', function(event, d) {
                d3.select(this).transition().duration(100).attr('r', 9).style('stroke-opacity', 1);
                tooltip.transition().duration(200).style('opacity', 0.9);
                tooltip.html(`<strong>User ${d.user_id}</strong><br/>${metricConfig.title}: ${d.value.toFixed(1)} ${metricConfig.unit}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function(d) {
                d3.select(this).transition().duration(100).attr('r', 6).style('stroke-opacity', 0.7);
                tooltip.transition().duration(500).style('opacity', 0);
            });

        circles.transition()
            .duration(800)
            .delay((d, i) => i * 10)
            .ease(d3.easeElasticOut)
            .attr("r", 6)
            .style('stroke-opacity', 0.7);

        const xAxis = d3.axisBottom(xScale).ticks(5).tickSize( -(height - margin.top - margin.bottom) );
        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke-opacity", 0.3)
                .attr("stroke-dasharray", "2,2"))
            .call(g => g.selectAll(".tick text")
                .attr("fill", "#ffffff")
                .attr("dy", 12));
            
        // Min/Max Markers
        const minValue = d3.min(metricData, d => d.value);
        const maxValue = d3.max(metricData, d => d.value);
        const markerY = height - margin.bottom;

        if (minValue !== maxValue) {
            // Min Marker
            svg.append('line')
                .attr('x1', xScale(minValue))
                .attr('y1', markerY)
                .attr('x2', xScale(minValue))
                .attr('y2', markerY + 10)
                .attr('stroke', '#e0e0e0')
                .attr('stroke-width', 2);
            svg.append('text')
                .attr('x', xScale(minValue))
                .attr('y', markerY + 25)
                .attr('text-anchor', 'middle')
                .attr('fill', '#e0e0e0')
                .style('font-size', '12px')
                .text(`Min: ${minValue.toFixed(1)}`);

            // Max Marker
            svg.append('line')
                .attr('x1', xScale(maxValue))
                .attr('y1', markerY)
                .attr('x2', xScale(maxValue))
                .attr('y2', markerY + 10)
                .attr('stroke', '#e0e0e0')
                .attr('stroke-width', 2);
            svg.append('text')
                .attr('x', xScale(maxValue))
                .attr('y', markerY + 25)
                .attr('text-anchor', 'middle')
                .attr('fill', '#e0e0e0')
                .style('font-size', '12px')
                .text(`Max: ${maxValue.toFixed(1)}`);
        } else {
             // If min and max are the same, show a single label
             svg.append('text')
                .attr('x', xScale(minValue))
                .attr('y', markerY + 25)
                .attr('text-anchor', 'middle')
                .attr('fill', '#e0e0e0')
                .style('font-size', '12px')
                .text(`Min/Max: ${minValue.toFixed(1)}`);
        }
    }

    // Event listeners
    prevButton.on('click', () => {
        if (currentMetricIndex > 0) {
            currentMetricIndex--;
            updateView();
        }
    });

    nextButton.on('click', () => {
        if (currentMetricIndex < introMetrics.length - 1) {
            currentMetricIndex++;
            updateView();
        }
    });

    // Initial render
    updateView();
}


// Ryan's code for Horomone Visualization

async function renderHoromoneChart(sleep_data_raw) {
    const containerId = '#hormone-chart';
    const chartContainer = d3.select(containerId);

    // Helper function for linear regression
    function calculateLinearRegression(data, xAccessor, yAccessor) {
        if (!data) return null;
        const validData = data.filter(d =>
            typeof xAccessor(d) === 'number' && !isNaN(xAccessor(d)) &&
            typeof yAccessor(d) === 'number' && !isNaN(yAccessor(d))
        );
        if (validData.length < 2) return null;

        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        const n = validData.length;

        validData.forEach(d => {
            const xVal = xAccessor(d);
            const yVal = yAccessor(d);
            sumX += xVal;
            sumY += yVal;
            sumXY += xVal * yVal;
            sumXX += xVal * xVal;
        });

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return null;
        const m = (n * sumXY - sumX * sumY) / denominator;
        const c = (sumY - m * sumX) / n;

        return { m, c, predict: function (x_input) { return this.m * x_input + this.c; } };
    }

    // Load hormone data directly within this function
    const hormone_data_entries = await loadHormoneData();

    // 2. Process sleep_data_raw to get average efficiency per user
    const sleep_data_by_user = sleep_data_raw.reduce((acc, curr) => {
        if (curr.user_id === undefined || curr.efficiency === undefined) return acc;
        acc[curr.user_id] = acc[curr.user_id] || [];
        acc[curr.user_id].push(curr);
        return acc;
    }, {});

    const user_sleep_summary = Object.keys(sleep_data_by_user).map(user_id_str => {
        const user_id = Number(user_id_str);
        const user_data = sleep_data_by_user[user_id];
        if (!user_data || user_data.length === 0) return null;
        const valid_efficiencies = user_data.map(d => d.efficiency).filter(e => typeof e === 'number' && !isNaN(e));
        if (valid_efficiencies.length === 0) return null;
        return {
            user_id: user_id,
            avg_efficiency: d3.mean(valid_efficiencies),
            totalSleepTime: d3.mean(user_data, d => d.totalSleepTime),
            wakeAfterSleepOnset: d3.mean(user_data, d => d.wakeAfterSleepOnset),
            movementIndex: d3.mean(user_data, d => d.movementIndex),
            sleepFragmentationIndex: d3.mean(user_data, d => d.sleepFragmentationIndex)
        };
    }).filter(item => item !== null && !isNaN(item.avg_efficiency));

    // 3. Merge hormone data with average sleep efficiency
    const merged_data_all_metrics = hormone_data_entries.map(h_entry => {
        const sleep_summary_entry = user_sleep_summary.find(s_entry => s_entry.user_id === h_entry.user_id);
        return {
            ...h_entry,
            avg_efficiency: sleep_summary_entry ? sleep_summary_entry.avg_efficiency : null,
            totalSleepTime: sleep_summary_entry ? sleep_summary_entry.totalSleepTime : null,
            wakeAfterSleepOnset: sleep_summary_entry ? sleep_summary_entry.wakeAfterSleepOnset : null,
            movementIndex: sleep_summary_entry ? sleep_summary_entry.movementIndex : null,
            sleepFragmentationIndex: sleep_summary_entry ? sleep_summary_entry.sleepFragmentationIndex : null
        };
    }).filter(d =>
        d.user_id !== 12 &&
        d.avg_efficiency !== null && d.avg_efficiency > 0 &&
        typeof d.melatonin === 'number' && !isNaN(d.melatonin) &&
        typeof d.cortisol === 'number' && !isNaN(d.cortisol)
    );

    let currentXAxisMetric = 'avg_efficiency';
    const xAxisMetricSelect = d3.select("#hormone-x-metric");
    chartContainer.selectAll('*').remove();

    const margin = { top: 60, right: 80, bottom: 60, left: 80 };
    const width = 1100 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svgRoot = chartContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgRoot.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const trendlineCheckbox = d3.select("#hormone-trendline-checkbox");
    const contextToggleCheckbox = d3.select("#hormone-context-toggle");
    const melatoninCheckbox = d3.select("#hormone-melatonin-checkbox");
    const cortisolCheckbox = d3.select("#hormone-cortisol-checkbox");
    const metricContextDiv = d3.select("#hormone-metric-context");
    
    d3.select(".hormone-tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "hormone-tooltip")
        .style("opacity", 0);

    function showTooltip(event, d, type) {
        tooltip.transition().duration(200).style("opacity", .9);
        const metricLabel = xAxisMetricSelect.node().selectedOptions[0].text;
        const metricValue = d[currentXAxisMetric] !== null ? d[currentXAxisMetric].toFixed(1) : 'N/A';
        let hormoneHtml = '';
        if (type === 'melatonin') {
            hormoneHtml = `<b>Melatonin:</b> ${d3.format(".2e")(d.melatonin)}`;
        } else {
            hormoneHtml = `<b>Cortisol:</b> ${d.cortisol.toFixed(2)}`;
        }
        tooltip.html(`<b>User ID:</b> ${d.user_id}<br/><b>${metricLabel}:</b> ${metricValue}<br/>${hormoneHtml}`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    function hideTooltip() {
        tooltip.transition().duration(300).style("opacity", 0);
    }
    
    svg.append("defs").append("clipPath").attr("id", "clip-hormone").append("rect").attr("width", width).attr("height", height);
    const plotArea = svg.append('g').attr('clip-path', 'url(#clip-hormone)');
    const xAxisG = svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height})`);
    const yMelatoninAxisG = svg.append('g').attr('class', 'y-axis y-axis-melatonin');
    const yCortisolAxisG = svg.append('g').attr('class', 'y-axis y-axis-cortisol').attr('transform', `translate(${width}, 0)`);

    function updateHormoneChart() {
        const showMelatonin = melatoninCheckbox.property("checked");
        const showCortisol = cortisolCheckbox.property("checked");

        currentXAxisMetric = xAxisMetricSelect.property("value");
        const selectedMetricText = xAxisMetricSelect.node().selectedOptions[0].text;
        
        svg.selectAll(".chart-title").remove();
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", width / 2).attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "22px")
            .style("font-weight", "bold")
            .style("fill", "#ffffff")
            .text(`Hormone Levels vs. ${selectedMetricText}`);
        
        const merged_data = merged_data_all_metrics.filter(d => d[currentXAxisMetric] !== null && !isNaN(d[currentXAxisMetric]));
        
        function getPaddedDomain(dataValues) {
            const [min, max] = d3.extent(dataValues);
            if (min === undefined || max === undefined) return [0, 1];
            if (min === max) {
                const padding = Math.abs(min * 0.1) || 0.1;
                return [min - padding, max + padding];
            }
            const padding = (max - min) * 0.05;
            return [min - padding, max + padding];
        }

        const xScale = d3.scaleLinear().domain(getPaddedDomain(merged_data.map(d => d[currentXAxisMetric]))).range([0, width]);
        const yMelatoninScale = d3.scaleLinear().domain(getPaddedDomain(merged_data.map(d => d.melatonin))).range([height, 0]);
        const yCortisolScale = d3.scaleLinear().domain(getPaddedDomain(merged_data.map(d => d.cortisol))).range([height, 0]);

        xAxisG.transition().duration(800).call(d3.axisBottom(xScale).ticks(7));
        yMelatoninAxisG.transition().duration(800).style('opacity', showMelatonin ? 1 : 0).call(d3.axisLeft(yMelatoninScale).tickFormat(d3.format(".1e")));
        yCortisolAxisG.transition().duration(800).style('opacity', showCortisol ? 1 : 0).call(d3.axisRight(yCortisolScale));

        svg.selectAll(".x-axis-label").remove();
        svg.append("text").attr("class", "x-axis-label").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height + margin.bottom - 10).style("fill", "white").text(selectedMetricText);
        
        svg.selectAll(".y-melatonin-label").remove();
        if (showMelatonin) {
            svg.append("text").attr("class", "y-melatonin-label").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -height / 2).style("fill", "#4A90E2").text("Melatonin");
        }
        
        svg.selectAll(".y-cortisol-label").remove();
        if (showCortisol) {
            svg.append("text").attr("class", "y-cortisol-label").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("y", width + margin.right - 20).attr("x", -height / 2).style("fill", "#F5A623").text("Cortisol");
        }

        yMelatoninAxisG.transition().duration(800).style('opacity', showMelatonin ? 1 : 0);
        yCortisolAxisG.transition().duration(800).style('opacity', showCortisol ? 1 : 0);

        plotArea.selectAll('.dot-melatonin').data(showMelatonin ? merged_data : [], d => d.user_id)
            .join(
                enter => enter.append('circle').attr('class', 'dot-melatonin').attr('r', 0).attr('cx', d => xScale(d[currentXAxisMetric])).attr('cy', d => yMelatoninScale(d.melatonin)),
                update => update,
                exit => exit.transition().duration(500).attr('r', 0).remove()
            )
            .attr('fill', '#4A90E2')
            .on('mouseover', function(e, d) { d3.select(this).attr('fill', '#7BB6F7').attr('r', 8); showTooltip(e, d, 'melatonin'); })
            .on('mouseout', function() { d3.select(this).attr('fill', '#4A90E2').attr('r', 6); hideTooltip(); })
            .transition().duration(800).attr('r', 6).attr('cx', d => xScale(d[currentXAxisMetric])).attr('cy', d => yMelatoninScale(d.melatonin));

        plotArea.selectAll('.dot-cortisol').data(showCortisol ? merged_data : [], d => d.user_id)
            .join(
                enter => enter.append('circle').attr('class', 'dot-cortisol').attr('r', 0).attr('cx', d => xScale(d[currentXAxisMetric])).attr('cy', d => yCortisolScale(d.cortisol)),
                update => update,
                exit => exit.transition().duration(500).attr('r', 0).remove()
            )
            .attr('fill', '#F5A623')
            .on('mouseover', function(e, d) { d3.select(this).attr('fill', '#FBCB7A').attr('r', 8); showTooltip(e, d, 'cortisol'); })
            .on('mouseout', function() { d3.select(this).attr('fill', '#F5A623').attr('r', 6); hideTooltip(); })
            .transition().duration(800).attr('r', 6).attr('cx', d => xScale(d[currentXAxisMetric])).attr('cy', d => yCortisolScale(d.cortisol));
        
        const regressions = [];
        if (trendlineCheckbox.property("checked")) {
            if (showMelatonin) {
                const melatonin_regression = calculateLinearRegression(merged_data, d => d[currentXAxisMetric], d => d.melatonin);
                if (melatonin_regression) {
                    regressions.push({
                        id: 'melatonin',
                        regression: melatonin_regression,
                        color: '#4A90E2',
                        yScale: yMelatoninScale
                    });
                }
            }
            if (showCortisol) {
                const cortisol_regression = calculateLinearRegression(merged_data, d => d[currentXAxisMetric], d => d.cortisol);
                if (cortisol_regression) {
                    regressions.push({
                        id: 'cortisol',
                        regression: cortisol_regression,
                        color: '#F5A623',
                        yScale: yCortisolScale
                    });
                }
            }
        }
        
        const trendlines = plotArea.selectAll('.regression-line')
            .data(regressions, d => d.id);

        trendlines.join(
            enter => enter.append('path')
                .attr('class', d => `regression-line ${d.id}-regression-line`)
                .attr('fill', 'none')
                .attr('stroke', d => d.color)
                .attr('stroke-width', 2.5)
                .attr('stroke-dasharray', '5,5')
                .style('opacity', 0)
                .attr('d', ({ regression, yScale }) => d3.line().x(d => xScale(d)).y(d => yScale(regression.predict(d)))(xScale.domain()))
                .transition().duration(800)
                .style('opacity', 1),
            update => update
                .transition().duration(800)
                .attr('d', ({ regression, yScale }) => d3.line().x(d => xScale(d)).y(d => yScale(regression.predict(d)))(xScale.domain())),
            exit => exit
                .transition().duration(800)
                .style('opacity', 0)
                .remove()
        );
        
        const summaryTextParagraph = d3.select("#hormone-summary p");
        let summaryHtml = "";
        let metricName;
        const contextBox = d3.select("#hormone-metric-context p");
        let contextHtml = "";

        switch (currentXAxisMetric) {
            case 'avg_efficiency':
                metricName = "Sleep Efficiency";
                contextHtml = `<strong>Sleep Efficiency:</strong> This measures the percentage of time spent asleep while in bed. Higher values (closer to 100%) indicate more consolidated and efficient sleep. It's a primary indicator of overall sleep quality.`;
                summaryHtml = "Higher melatonin levels appear to correlate with improved Sleep Efficiency reflecting melatonins ability to help maintain continuous rest, minimizing nighttime awakenings. Interestingly, users with higher cortisol levels tend to have higher sleep efficiency in this dataset.";
                break;
            case 'totalSleepTime':
                metricName = "Total Sleep Time (TST)";
                contextHtml = `<strong>Total Sleep Time (TST):</strong> This is the total duration of actual sleep obtained during the night, measured in minutes. While more sleep isn't always better if it's fragmented, sufficient TST is crucial for rest and recovery.`;
                summaryHtml = `Although melatonin contributes to an average increase of about 7 minutes in total sleep time across users, the relationship is inconsistent. This highlights that melatonin's primary benefit isn't necessarily in prolonging sleep, but in enhancing its continuity and quality. 
                    Notably, users with lower cortisol levels tend to sleep longer.`;
                break;
            case 'wakeAfterSleepOnset':
                metricName = "Wake After Sleep Onset (WASO)";
                contextHtml = `<strong>Wake After Sleep Onset (WASO):</strong> This metric quantifies the amount of time, in minutes, an individual is awake after initially falling asleep and before their final awakening. Lower WASO values are desirable, indicating more continuous and less interrupted sleep.`;
                summaryHtml = `This chart illustrates melatonin's strongest effect: reducing interruptions during the night. Users with higher melatonin and lower cortisol levels generally show lower WASO scores, suggesting they wake up less often and stay asleep more consistently.`;
                break;
            case 'movementIndex':
                metricName = "Movement Index";
                contextHtml = `<strong>Movement Index:</strong> This reflects the amount of physical movement during sleep, typically measured by an actigraph. A lower movement index generally suggests more restful and less disturbed sleep. High movement can indicate restlessness or frequent arousals.`;
                summaryHtml = "Here we can see that melatonin levels appear to be correlated with less movement during sleep for most users. This is a desirable outcome, as a lower movement index indicates more stable and restful sleep, which contributes to better overall sleep quality.";
                break;
            case 'sleepFragmentationIndex':
                metricName = "Sleep Fragmentation Index";
                contextHtml = `<strong>Sleep Fragmentation Index:</strong> This metric quantifies how broken or interrupted sleep is. It considers the number and duration of awakenings or shifts to lighter sleep stages. A lower index indicates more consolidated, higher-quality sleep.`;
                summaryHtml = "This chart shows a tendency for higher melatonin levels to be associated with a lower Sleep Fragmentation Index. A lower fragmentation index is beneficial, indicating that sleep is more continuous and less interrupted. This leads to a more restorative and higher-quality night's rest.";
                break;
            default:
                contextHtml = "Select a metric to see its definition and context.";
                summaryHtml = "";
        }
        summaryTextParagraph.html(summaryHtml);
        contextBox.html(contextHtml);
    }

    updateHormoneChart();

    if (xAxisMetricSelect.node()) {
        xAxisMetricSelect.on("change", updateHormoneChart);
    }
    if (trendlineCheckbox.node()) {
        trendlineCheckbox.on("change", updateHormoneChart);
    }
    if (melatoninCheckbox.node()) {
        melatoninCheckbox.on("change", updateHormoneChart);
    }
    if (cortisolCheckbox.node()) {
        cortisolCheckbox.on("change", updateHormoneChart);
    }
    if (contextToggleCheckbox.node()) {
        contextToggleCheckbox.property("checked", false);
        metricContextDiv.style("display", "none");
        contextToggleCheckbox.on("change", function() {
            metricContextDiv.style("display", this.checked ? "block" : "none");
        });
    }
}

async function initHormoneChart() {
    const chartContainerId = '#hormone-chart';
    const sleep_data_for_hormones = await loadSleepData();

    await renderHoromoneChart(sleep_data_for_hormones);
}

// Shriya's code for Activity Visualization
const activityMargin = { top: 40, right: 40, bottom: 60, left: 60 }; // MODIFIED: Right margin reduced
const detailedActivityWidth = 900; // MODIFIED: Increased width
const detailedActivityHeight = 550; // MODIFIED: Increased height

// Small multiples grid settings
const smallWidth = 160; // MODIFIED: Increased width
const smallHeight = 110; // MODIFIED: Increased height
const gridCols = 6;
const gridPadding = 20;

async function loadAllUsersData() {
    const users = Array.from({ length: 22 }, (_, i) => i + 1);
    const allData = await Promise.all(
        users.map(userId => loadActigraphData(userId))
    );
    return allData;
}

async function loadActigraphData(userId = 1) {
    const data = await d3.csv(`data/user_data/user_${userId}/Actigraph.csv`, d => {
        const [hours, minutes, seconds] = d.time.split(':').map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + (seconds || 0);

        return {
            time: d.time,
            totalSeconds: totalSeconds,
            steps: +d.Steps,
            hr: d.HR,
            userId: userId
        };
    });
    return data;
}

function processData(data) {
    const activityByTime = new Array(24).fill(null)
        .map(() => new Array(60).fill(null)
            .map(() => ({ steps: 0, hr: 0, count: 0 })));

    data.forEach(d => {
        const [hours, minutes] = d.time.split(':').map(Number);
        activityByTime[hours][minutes].steps += d.steps;
        if (d.hr) {
            activityByTime[hours][minutes].hr += +d.hr;
            activityByTime[hours][minutes].count += 1;
        }
    });

    // Calculate averages for heart rate
    activityByTime.forEach(row => {
        row.forEach(cell => {
            if (cell.count > 0) {
                cell.hr = Math.round(cell.hr / cell.count);
            }
        });
    });

    return activityByTime;
}

function createHeatmap(svgHeatmapG, data, width, height, isSmall = false, legendContainerDiv = null) {
    const activityByTime = processData(data);
    const maxSteps = Math.max(...activityByTime.map(row => Math.max(...row.map(cell => cell.steps))));
    const maxHR = Math.max(...activityByTime.map(row => Math.max(...row.map(cell => cell.hr))));

    const cellHeight = height / 24;
    const cellWidth = width / 60;

    // Create color scales for heart rate zones
    const hrZones = [
        { min: 0, max: 90, color: '#FFFFD0', label: 'Moderate activity' },    // Light yellow
        { min: 90, max: 120, color: '#FFE066', label: 'Weight control' },     // Yellow
        { min: 120, max: 140, color: '#FFA500', label: 'Aerobic' },          // Orange
        { min: 140, max: 170, color: '#FF6B00', label: 'Anaerobic' },        // Dark Orange
        { min: 170, max: 200, color: '#FF0000', label: 'VO2 Max' }           // Red
    ];

    const hrColorScale = d3.scaleLinear()
        .domain(hrZones.map(zone => zone.min))
        .range(hrZones.map(zone => zone.color))
        .clamp(true);

    // Opacity scale for steps
    const opacityScale = d3.scaleLinear()
        .domain([0, maxSteps])
        .range([0.1, 1]);

    const xScale = d3.scaleLinear()
        .domain([0, 60])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([0, height]);

    // Create heatmap cells within svgHeatmapG (the <g> element passed for the heatmap)
    svgHeatmapG.selectAll('rect.heatmap-cell') // Added a class for clarity
        .data(activityByTime.flatMap((row, hour) =>
            row.map((cell, minute) => ({
                hour,
                minute,
                steps: cell.steps,
                hr: cell.hr
            }))
        ))
        .join('rect')
        .attr('class', 'heatmap-cell') // Added a class
        .attr('x', d => xScale(d.minute))
        .attr('y', d => yScale(d.hour))
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', d => hrColorScale(d.hr))
        .attr('opacity', d => opacityScale(d.steps));

    if (!isSmall) {
        // Add axes for main view to svgHeatmapG
        const xAxis = d3.axisBottom(xScale)
            .ticks(12)
            .tickFormat(d => d + 'm');

        const yAxis = d3.axisLeft(yScale)
            .ticks(24)
            .tickFormat(d => d + 'h');

        svgHeatmapG.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);

        svgHeatmapG.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Add axis labels to svgHeatmapG
        svgHeatmapG.append('text')
            .attr('class', 'x-label')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height + 40)
            .text('Minute');

        svgHeatmapG.append('text')
            .attr('class', 'y-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -height / 2)
            .text('Hour');

        // Bivariate Legend Creation (Modified for HTML div container)
        if (legendContainerDiv) { // legendContainerDiv is an HTML <div> element
            legendContainerDiv.selectAll('*').remove(); // Clear previous legend content

            const legendCellSize = 18;
            const legendPadding = 4;
            const legendTitleBlockHeight = 40; // Space for main title + subtitle
            const legendAxisTitleHeight = 20; // For "Step Intensity" / "HR Zone" titles
            const legendLabelHeight = 18; // For individual labels like "Low", "Med", "High"
            const yAxisLabelAreaWidth = 70; // Width for "Aerobic", "VO2 Max" labels on Y
            const xAxisLabelAreaHeight = legendAxisTitleHeight + legendLabelHeight; // Total height for X-axis labels area

            const numStepCategories = 3;
            const numHrZones = hrZones.length;

            const legendGridWidth = numStepCategories * (legendCellSize + legendPadding) - legendPadding;
            const legendGridHeight = numHrZones * (legendCellSize + legendPadding) - legendPadding;

            const internalSvgPadding = { top: 10, right: 10, bottom: 10, left: 10 };

            // Calculate total required SVG dimensions
            const legendSvgWidth = yAxisLabelAreaWidth + legendGridWidth + internalSvgPadding.left + internalSvgPadding.right;
            const legendSvgHeight = legendTitleBlockHeight + legendGridHeight + xAxisLabelAreaHeight + internalSvgPadding.top + internalSvgPadding.bottom;

            const legendSvg = legendContainerDiv.append('svg')
                .attr('width', legendSvgWidth)
                .attr('height', legendSvgHeight)
                .style('display', 'block');

            const legendG = legendSvg.append('g')
                .attr('transform', `translate(${internalSvgPadding.left}, ${internalSvgPadding.top})`);

            // Define step intensity categories for the legend
            const stepCategories = [
                { label: 'Low', value: maxSteps / 6, representativeOpacity: opacityScale(maxSteps / 6) },
                { label: 'Med', value: maxSteps / 2, representativeOpacity: opacityScale(maxSteps / 2) },
                { label: 'High', value: 5 * maxSteps / 6, representativeOpacity: opacityScale(5 * maxSteps / 6) }
            ];
            if (maxSteps === 0) { // Handle case with no steps
                stepCategories.forEach(cat => cat.representativeOpacity = opacityScale(0));
            }

            // Legend Main Title
            legendG.append('text')
                .attr('x', (yAxisLabelAreaWidth + legendGridWidth) / 2) // Centered over labels + grid
                .attr('y', legendTitleBlockHeight / 2 - 5)
                .attr('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .style('fill', '#ffffff')
                .text('Activity Intensity');

            // Legend Subtitle
            legendG.append('text')
                .attr('x', (yAxisLabelAreaWidth + legendGridWidth) / 2) // Centered
                .attr('y', legendTitleBlockHeight / 2 + 10)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', '#ffffff')
                .text('(Color: HR Zone, Opacity: Steps)');

            // Create legend cells, positioned after Y-axis labels and below title block
            const cellsGroupX = yAxisLabelAreaWidth;
            const cellsGroupY = legendTitleBlockHeight;

            hrZones.forEach((hrZone, i) => {
                stepCategories.forEach((stepCat, j) => {
                    legendG.append('rect')
                        .attr('x', cellsGroupX + j * (legendCellSize + legendPadding))
                        .attr('y', cellsGroupY + i * (legendCellSize + legendPadding))
                        .attr('width', legendCellSize)
                        .attr('height', legendCellSize)
                        .attr('fill', hrZone.color)
                        .attr('opacity', stepCat.representativeOpacity);
                });
            });

            // Add HR Zone Axis Title (Vertical)
            legendG.append('text')
                .attr('transform', `rotate(-90)`)
                .attr('y', yAxisLabelAreaWidth / 2 - 25) // Centered along the yAxisLabelAreaWidth
                .attr('x', -(cellsGroupY + legendGridHeight / 2)) // Centered along the cell grid height
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('fill', '#ffffff')
                .text('HR Zone');
                
            // Add HR Zone labels (Y-axis of legend)
            hrZones.forEach((hrZone, i) => {
                legendG.append('text')
                    .attr('x', yAxisLabelAreaWidth - legendPadding - 5) // Position to the left of cells
                    .attr('y', cellsGroupY + i * (legendCellSize + legendPadding) + legendCellSize / 2)
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', '9px')
                    .style('fill', '#ffffff')
                    .text(hrZone.label.split(' ')[0]); // Show only first word if too long
            });

            // Add Steps Intensity Axis Title (Horizontal)
            const stepAxisTitleY = cellsGroupY + legendGridHeight + legendPadding + legendAxisTitleHeight / 2;
            legendG.append('text')
                .attr('x', cellsGroupX + legendGridWidth / 2)
                .attr('y', stepAxisTitleY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('fill', '#ffffff')
                .text('Step Intensity');

            // Add Step Intensity labels (X-axis of legend)
            const stepLabelsY = stepAxisTitleY + legendAxisTitleHeight / 2 + legendLabelHeight / 2;
            stepCategories.forEach((stepCat, j) => {
                legendG.append('text')
                    .attr('x', cellsGroupX + j * (legendCellSize + legendPadding) + legendCellSize / 2)
                    .attr('y', stepLabelsY)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', '9px')
                    .style('fill', '#ffffff')
                    .text(stepCat.label);
            });
        } // End of if (legendContainerDiv)
    }

    return { maxSteps };
}

async function initActivityChart() {
    const allData = await loadAllUsersData();
    const sleepData = await loadSleepData(); // Load sleep data here

    // Create container for small multiples
    const container = d3.select('#activity-chart');

    // Add title
    container.append('h2');

    // Create grid for small multiples
    const gridContainer = container.append('div') // Renamed from grid to gridContainer for clarity
        .attr('class', 'small-multiples-grid')
        .style('grid-template-columns', `repeat(${gridCols}, 1fr)`)
        .style('gap', `${gridPadding}px`);

    // Create small multiples
    const sortedData = allData.map((userData, index) => ({
        userId: index + 1,
        data: userData,
        totalSteps: userData.reduce((sum, d) => sum + d.steps, 0)
    }))
        .sort((a, b) => a.totalSteps - b.totalSteps)  // Sort by total steps ascending
        .filter(d => d.userId !== 11);

    sortedData.forEach(({ userId, data: userData, totalSteps }) => {
        const cell = gridContainer.append('div') // Use gridContainer
            .attr('class', 'grid-cell')
            .on('click', () => showDetailView(userId));

        cell.append('h4')
            .text(`User ${userId}`);

        const svg = cell.append('svg')
            .attr('width', smallWidth)
            .attr('height', smallHeight)
            .append('g')
            .attr('transform', `translate(5,5)`);

        createHeatmap(svg, userData, smallWidth - 10, smallHeight - 10, true);

        // Display total steps
        cell.append('div')
            .attr('class', 'total-steps-display')
            .html(`Total Steps: <strong>${totalSteps.toLocaleString()}</strong>`);

        // Find user's sleep data and calculate average TST
        const userSleepEntries = sleepData.filter(entry => entry.user_id === userId);
        let avgTSTDisplay = "N/A";
        if (userSleepEntries.length > 0) {
            const validTstEntries = userSleepEntries.map(d => d.totalSleepTime).filter(tst => typeof tst === 'number' && !isNaN(tst));
            if (validTstEntries.length > 0) {
                const avgTSTMinutes = d3.mean(validTstEntries);
                avgTSTDisplay = `${avgTSTMinutes.toFixed(0)} min`;
            }
        }

        // Display average TST
        cell.append('div')
            .attr('class', 'average-tst-display') // New class for styling
            .html(`Total Sleep: <strong>${avgTSTDisplay}</strong>`);
    });

    // Create detail view container (hidden initially)
    const detailContainer = container.append('div')
        // .style('display', 'none') // display:none is set by CSS by default now
        .attr('class', 'detail-view');

    // To store the reference to the outside click listener for easy removal
    let outsideClickListener = null;

    function closeActivityDetailView() {
        detailContainer.style('display', 'none');
        gridContainer.style('display', 'grid');
        if (outsideClickListener) {
            document.removeEventListener('click', outsideClickListener, true);
            outsideClickListener = null; // Clear reference after removing
        }
    }

    function showDetailView(userId) {
        const userData = allData[userId - 1];
        const userSleepLog = sleepData.find(entry => entry.user_id === userId);

        gridContainer.style('display', 'none'); // Hide grid
        detailContainer.style('display', 'flex'); // Show detail view (it's a flex column)
        detailContainer.html(''); // Clear previous content

        // Define the outside click listener function for this specific view instance
        outsideClickListener = (event) => {
            // Check if the detailContainer is visible and the click is outside of it
            if (detailContainer.node() && 
                detailContainer.style('display') === 'flex' && 
                !detailContainer.node().contains(event.target)) {
                
                // Additional check: ensure the click wasn't on a grid cell, which would reopen the view
                const clickedOnGridCell = gridContainer.selectAll('.grid-cell').nodes().some(cell => cell.contains(event.target));
                if (!clickedOnGridCell) {
                    closeActivityDetailView();
                }
            }
        };
        // Add the listener in the capture phase to catch clicks early.
        document.addEventListener('click', outsideClickListener, true);

        // Add header with controls
        const header = detailContainer.append('div')
            .attr('class', 'detail-view-header');

        header.append('h2')
            .text(`User ${userId} Activity Pattern`);

        const controls = header.append('div')
            .attr('class', 'detail-view-controls');

        // Add view mode selector
        let currentViewMode = 'hour';
        const viewSelector = controls.append('div')
            .attr('class', 'view-selector');
        viewSelector.append('label')
            .attr('for', 'view-mode')
            .text('View Mode:');
        viewSelector.append('select')
            .attr('id', 'view-mode')
            .on('change', function () {
                currentViewMode = this.value;
                hourHighlights.style('pointer-events', currentViewMode === 'hour' ? 'all' : 'none');
                minuteHighlights.style('pointer-events', currentViewMode === 'minute' ? 'all' : 'none');
            })
            .selectAll('option')
            .data([
                { value: 'hour', text: 'Hour View' },
                { value: 'minute', text: 'Minute View' }
            ])
            .join('option')
            .attr('value', d => d.value)
            .text(d => d.text);

        // Variables for sleep related elements, defined outside to be accessible
        let sleepMetricsDisplay = null; // Will hold the D3 selection for the metrics div
        const inBedDateTime = userSleepLog ? new Date(`${userSleepLog.inBedDate.toDateString()} ${userSleepLog.inBedTime}`) : null;
        const outBedDateTime = userSleepLog ? new Date(`${userSleepLog.outBedDate.toDateString()} ${userSleepLog.outBedTime}`) : null;

        // Add Sleep Period Highlight Toggle
        if (userSleepLog) {
            const sleepToggleDiv = controls.append('div')
                .attr('class', 'view-selector'); 
            sleepToggleDiv.append('label')
                .attr('for', 'sleep-highlight-toggle')
                .text('Highlight In-Bed Time:');
            sleepToggleDiv.append('input')
                .attr('type', 'checkbox')
                .attr('id', 'sleep-highlight-toggle')
                .on('change', function() {
                    const metricsContainer = legendAndMetricsContainer.select('.sleep-metrics-display');
                    updateSleepHighlight(this.checked, inBedDateTime, outBedDateTime, heatmapGroup, metricsContainer.empty() ? null : metricsContainer);
                });
        }

        // Add close button
        controls.append('button')
            .attr('class', 'detail-view-close-button')
            .html('&times;') // Use &times; HTML entity for X icon
            .on('click', () => {
                closeActivityDetailView(); // Call the centralized close function
            });

        const explainerText = detailContainer.append('div')
            .attr('class', 'detail-view-explainer-text')
            .html(`
                <p>This visualization shows the activity pattern of User ${userId} throughout the day. The heatmap displays the intensity of activity at each hour and minute, with darker colors indicating higher activity levels. Hover over the heatmap to see the activity levels for that hour or minute, and toggle In-Bed Time to see how much time ${userId} spent in bed.</p>
            `);

        // Create content wrapper for flex layout
        const contentWrapper = detailContainer.append('div')
            .attr('class', 'detail-view-content-wrapper');

        // Create main visualization SVG and legend container within the heatmapSvgContainer
        const heatmapSvgContainer = contentWrapper.append('div')
            .attr('class', 'heatmap-svg-container');

        // Container for Legend and Sleep Metrics
        const legendAndMetricsContainer = heatmapSvgContainer.append('div')
            .attr('class', 'legend-and-metrics-wrapper');

        // Add title for the Legend
        legendAndMetricsContainer.append('h4').text('Legend');

        // Div specifically for the legend SVG
        const actualLegendSvgHolderDiv = legendAndMetricsContainer.append('div')
            .attr('class', 'activity-legend-svg-target'); 

        // Heatmap SVG
        const svgRootElement = heatmapSvgContainer.append('svg')
            .attr('width', detailedActivityWidth + activityMargin.left + activityMargin.right)
            .attr('height', detailedActivityHeight + activityMargin.top + activityMargin.bottom);

        const heatmapGroup = svgRootElement.append('g')
            .attr('transform', `translate(${activityMargin.left},${activityMargin.top})`);

        // Summary panel (tooltip) is appended to detailContainer for simpler positioning context
        const summaryPanel = detailContainer.append('div')
            .attr('class', 'summary-panel');

        const activityByTime = processData(userData);
        // Pass actualLegendSvgHolderDiv for the legend
        createHeatmap(heatmapGroup, userData, detailedActivityWidth, detailedActivityHeight, false, actualLegendSvgHolderDiv);

        // Add sleep metrics display below the legend
        if (userSleepLog) {
            sleepMetricsDisplay = legendAndMetricsContainer.select('.sleep-metrics-display');
            if (sleepMetricsDisplay.empty()) {
                 sleepMetricsDisplay = legendAndMetricsContainer.append('div')
                    .attr('class', 'sleep-metrics-display');
            }
            
            sleepMetricsDisplay.selectAll("h4, p:not(#in-bed-duration-metric)").remove();

            sleepMetricsDisplay.append('h4').text('Key Sleep Metrics');
            sleepMetricsDisplay.append('p')
                .html(`<strong>Efficiency:</strong> ${userSleepLog.efficiency !== null && !isNaN(userSleepLog.efficiency) ? userSleepLog.efficiency.toFixed(1) + '%' : 'N/A'}`);

            if (userSleepLog.totalSleepTime !== null && !isNaN(userSleepLog.totalSleepTime)) {
                const tstMinutes = userSleepLog.totalSleepTime;
                const tstHours = (tstMinutes / 60).toFixed(1);
                sleepMetricsDisplay.append('p')
                    .html(`<strong>Total Sleep Time:</strong> ${tstMinutes} min (${tstHours} hrs)`);
            } else {
                sleepMetricsDisplay.append('p')
                    .html(`<strong>Total Sleep Time:</strong> N/A`);
            }

            sleepMetricsDisplay.append('p')
                .html(`<strong>Wake After Sleep Onset:</strong> ${userSleepLog.wakeAfterSleepOnset !== null && !isNaN(userSleepLog.wakeAfterSleepOnset) ? userSleepLog.wakeAfterSleepOnset.toFixed(0) + ' min' : 'N/A'}`);
        
            const highlightToggle = d3.select('#sleep-highlight-toggle');
            if (!highlightToggle.empty() && highlightToggle.property('checked')) {
                updateSleepHighlight(true, inBedDateTime, outBedDateTime, heatmapGroup, sleepMetricsDisplay);
            }
        }

        // Define the highlighting function
        function updateSleepHighlight(highlight, inBedDateTimeLocal, outBedDateTimeLocal, hg, metricsDisplayContainer) {
            const cells = hg.selectAll('rect.heatmap-cell');

            if (metricsDisplayContainer && !metricsDisplayContainer.empty()) {
                metricsDisplayContainer.select('p#in-bed-duration-metric').remove();
            }

            if (highlight) {
                const inBedHour = inBedDateTimeLocal.getHours();
                const inBedMinute = inBedDateTimeLocal.getMinutes();
                const outBedHour = outBedDateTimeLocal.getHours();
                const outBedMinute = outBedDateTimeLocal.getMinutes();

                cells.each(function(d) {
                    const cellHour = d.hour;
                    const cellMinute = d.minute;
                    let inSleepPeriod = false;
                    const cellTimeInMinutes = cellHour * 60 + cellMinute;
                    const inBedTimeInMinutes = inBedHour * 60 + inBedMinute;
                    const outBedTimeInMinutes = outBedHour * 60 + outBedMinute;

                    if (inBedTimeInMinutes <= outBedTimeInMinutes) {
                        if (cellTimeInMinutes >= inBedTimeInMinutes && cellTimeInMinutes < outBedTimeInMinutes) {
                            inSleepPeriod = true;
                        }
                    } else { 
                        if (cellTimeInMinutes >= inBedTimeInMinutes || cellTimeInMinutes < outBedTimeInMinutes) {
                            inSleepPeriod = true;
                        }
                    }
                    d3.select(this).classed('sleep-period-highlight', inSleepPeriod);
                });

                if (metricsDisplayContainer && !metricsDisplayContainer.empty()) {
                    let highlightedDurationMinutes = Math.round((outBedDateTimeLocal.getTime() - inBedDateTimeLocal.getTime()) / (1000 * 60));
                    let highlightedDurationHours = (highlightedDurationMinutes / 60).toFixed(1);

                    // Fallback for same CSV date but overnight times (e.g., In Bed 23:00, Out Bed 07:00, both on user_sleep_data.csv for May 5th)
                    // This happens if outBedDateTimeLocal.getTime() < inBedDateTimeLocal.getTime() because the dates are the same
                    // but the out time is earlier in the day than the in time.
                    if (highlightedDurationMinutes < 0) { 
                        const inBedTotalMinutesFromMidnight = inBedDateTimeLocal.getHours() * 60 + inBedDateTimeLocal.getMinutes();
                        const outBedTotalMinutesFromMidnight = outBedDateTimeLocal.getHours() * 60 + outBedDateTimeLocal.getMinutes();
                        highlightedDurationMinutes = ((24 * 60) - inBedTotalMinutesFromMidnight) + outBedTotalMinutesFromMidnight;
                        highlightedDurationHours = (highlightedDurationMinutes / 60).toFixed(1);
                    }

                    metricsDisplayContainer.append('p')
                        .attr('id', 'in-bed-duration-metric')
                        .html(`<strong>Time In Bed Duration:</strong> ${highlightedDurationMinutes} min (${highlightedDurationHours} hrs)`);
                }
            } else {
                cells.classed('sleep-period-highlight', false);
            }
        }

        // Add hour highlights to the heatmapGroup
        const hourHighlights = heatmapGroup.append('g')
            .attr('class', 'hour-highlights')
            .selectAll('rect')
            .data(Array.from({ length: 24 }, (_, i) => i))
            .join('rect')
            .attr('x', 0)
            .attr('y', hour => (hour * detailedActivityHeight) / 24) // MODIFIED
            .attr('width', detailedActivityWidth) // MODIFIED
            .attr('height', detailedActivityHeight / 24) // MODIFIED
            .attr('fill', 'transparent')
            .attr('pointer-events', 'all')
            .on('mouseover', function (event, hour) {
                if (currentViewMode === 'hour') {
                    d3.select(this).attr('fill', 'rgba(0,0,0,0.1)');
                    updateSummaryPanel(activityByTime, hour, 'hour', summaryPanel);

                    const panelNode = summaryPanel.node();
                    const targetRect = event.target.getBoundingClientRect();
                    // Use detailContainer.node() for the reference rectangle, as it's the positioned parent.
                    const detailViewRect = detailContainer.node().getBoundingClientRect(); 

                    let panelTop, panelLeft;
                    const panelWidth = panelNode.offsetWidth;
                    const panelHeight = panelNode.offsetHeight;
                    const offset = 10; // Gap between highlight and panel

                    // Attempt to position above or below based on hour, then adjust
                    if (hour < 12) { // Try to position above first
                        panelTop = targetRect.top - detailViewRect.top - panelHeight - offset;
                        if (panelTop < 0) { // If not enough space above, position below
                            panelTop = targetRect.bottom - detailViewRect.top + offset;
                        }
                    } else { // Try to position below first
                        panelTop = targetRect.bottom - detailViewRect.top + offset;
                        if (panelTop + panelHeight > detailViewRect.height) { // If not enough space below, position above
                             panelTop = targetRect.top - detailViewRect.top - panelHeight - offset;
                        }
                    }
                    
                    panelLeft = targetRect.left - detailViewRect.left + (targetRect.width / 2) - (panelWidth / 2);

                    // Boundary checks to keep panel within detailViewRect
                    if (panelLeft < 0) panelLeft = 5;
                    if (panelLeft + panelWidth > detailViewRect.width) panelLeft = detailViewRect.width - panelWidth - 5;
                    if (panelTop < 0) panelTop = 5;
                    if (panelTop + panelHeight > detailViewRect.height) panelTop = detailViewRect.height - panelHeight - 5;
                    

                    summaryPanel
                        .style('left', `${panelLeft}px`)
                        .style('top', `${panelTop}px`)
                        .style('opacity', 1);
                }
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', 'transparent');
                summaryPanel.style('opacity', 0);
            });

        // Add minute highlights to the heatmapGroup
        const minuteHighlights = heatmapGroup.append('g')
            .attr('class', 'minute-highlights')
            .selectAll('rect')
            .data(Array.from({ length: 60 }, (_, i) => i))
            .join('rect')
            .attr('x', minute => (minute * detailedActivityWidth) / 60) // MODIFIED
            .attr('y', 0)
            .attr('width', detailedActivityWidth / 60) // MODIFIED
            .attr('height', detailedActivityHeight) // MODIFIED
            .attr('fill', 'transparent')
            .attr('pointer-events', 'none')
            .on('mouseover', function (event, minute) {
                if (currentViewMode === 'minute') {
                    d3.select(this).attr('fill', 'rgba(0,0,0,0.1)');
                    updateSummaryPanel(activityByTime, minute, 'minute', summaryPanel);

                    const panelNode = summaryPanel.node();
                    const targetRect = event.target.getBoundingClientRect();
                     // Use detailContainer.node() for the reference rectangle
                    const detailViewRect = detailContainer.node().getBoundingClientRect();

                    let panelTop, panelLeft;
                    const panelWidth = panelNode.offsetWidth;
                    const panelHeight = panelNode.offsetHeight;
                    const offset = 10; // Gap

                    // Attempt to position left or right based on minute, then adjust
                    if (minute < 30) { // Try to position to the left
                        panelLeft = targetRect.left - detailViewRect.left - panelWidth - offset;
                        if (panelLeft < 0) { // If not enough space left, position right
                            panelLeft = targetRect.right - detailViewRect.left + offset;
                        }
                    } else { // Try to position to the right
                        panelLeft = targetRect.right - detailViewRect.left + offset;
                        if (panelLeft + panelWidth > detailViewRect.width) { // If not enough space right, position left
                            panelLeft = targetRect.left - detailViewRect.left - panelWidth - offset;
                        }
                    }
                    panelTop = targetRect.top - detailViewRect.top + (targetRect.height / 2) - (panelHeight / 2);
                    
                    // Boundary checks
                    if (panelTop < 0) panelTop = 5;
                    if (panelTop + panelHeight > detailViewRect.height) panelTop = detailViewRect.height - panelHeight - 5;
                    if (panelLeft < 0) panelLeft = 5;
                    if (panelLeft + panelWidth > detailViewRect.width) panelLeft = detailViewRect.width - panelWidth - 5;


                    summaryPanel
                        .style('left', `${panelLeft}px`)
                        .style('top', `${panelTop}px`)
                        .style('opacity', 1);
                }
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', 'transparent');
                summaryPanel.style('opacity', 0);
            });
    }

    function calculateHourStats(activityData, hour) {
        const hourData = activityData[hour];
        const totalSteps = hourData.reduce((sum, cell) => sum + cell.steps, 0);
        const mostActiveMinute = hourData.reduce((max, cell, minute) =>
            cell.steps > hourData[max].steps ? minute : max, 0);
        const activeMinutes = hourData.filter(cell => cell.steps > 0).length;
        const activePercentage = (activeMinutes / 60) * 100;

        // Calculate average heart rate for the hour
        const validHR = hourData.filter(cell => cell.hr > 0).map(cell => cell.hr);
        const avgHR = validHR.length > 0 ? Math.round(d3.mean(validHR)) : 0;

        return {
            totalSteps,
            mostActiveMinute,
            activePercentage,
            avgHR
        };
    }

    function calculateMinuteStats(activityData, minute) {
        const minuteData = activityData.map(hour => hour[minute]);
        const totalSteps = minuteData.reduce((sum, cell) => sum + cell.steps, 0);
        const mostActiveHour = minuteData.reduce((max, cell, hour) =>
            cell.steps > minuteData[max].steps ? hour : max, 0);
        const activeHours = minuteData.filter(cell => cell.steps > 0).length;
        const activePercentage = (activeHours / 24) * 100;

        // Calculate average heart rate for the minute
        const validHR = minuteData.filter(cell => cell.hr > 0).map(cell => cell.hr);
        const avgHR = validHR.length > 0 ? Math.round(d3.mean(validHR)) : 0;

        return {
            totalSteps,
            mostActiveHour,
            activePercentage,
            avgHR
        };
    }

    function updateSummaryPanel(activityData, value, type, panel) {
        const stats = type === 'hour' ?
            calculateHourStats(activityData, value) :
            calculateMinuteStats(activityData, value);

        panel.style('opacity', 1)
            .html('');

        panel.append('h3')
            .text(type === 'hour' ? `Hour ${value} Summary` : `Minute ${value} Summary`);

        if (type === 'hour') {
            panel.append('div')
                .html(`<strong>Total Steps:</strong> ${stats.totalSteps}`);
            panel.append('div')
                .html(`<strong>Most Active Minute:</strong> :${stats.mostActiveMinute.toString().padStart(2, '0')}`);
            panel.append('div')
                .html(`<strong>Active Minutes:</strong> ${stats.activePercentage.toFixed(1)}%`);
            panel.append('div')
                .html(`<strong>Average Heart Rate:</strong> ${stats.avgHR > 0 ? stats.avgHR + ' bpm' : 'No data'}`);
        } else {
            panel.append('div')
                .html(`<strong>Total Steps:</strong> ${stats.totalSteps}`);
            panel.append('div')
                .html(`<strong>Most Active Hour:</strong> ${stats.mostActiveHour}:00`);
            panel.append('div')
                .html(`<strong>Active Hours:</strong> ${stats.activePercentage.toFixed(1)}%`);
            panel.append('div')
                .html(`<strong>Average Heart Rate:</strong> ${stats.avgHR > 0 ? stats.avgHR + ' bpm' : 'No data'}`);
        }
    }
}

// Stress/Negative Emotion Chart - Shriya
async function loadStressData() {
    const data = await d3.csv('data/clean_data/user_stress_data.csv', (row) => ({
        ...row,
        user_id: Number(row.user_id),
        Avg_Neg_PANAs: Number(row.Avg_Neg_PANAs),
        Daily_stress: Number(row.Daily_stress)
    }));

    console.log('First few questionaire entries:', data.slice(0, 3));
    return data;
}

async function initStressChart() {
    const sleep_data = await loadSleepData();
    const stress_data = await loadStressData();

    const urlParams = new URLSearchParams(window.location.search);
    let newUserData = null;
    if (urlParams.get('source') === 'quiz') {
        newUserData = {
            user_id: 'your_score',
            Daily_stress: parseFloat(urlParams.get('DSI_Total_Score')),
            Avg_Neg_PANAs: parseFloat(urlParams.get('Avg_Neg_PANAs')), // This now comes from the PANAS score
            sleepFragmentationIndex: parseFloat(urlParams.get('sleepFragmentationIndex')),
            numberOfAwakenings: parseFloat(urlParams.get('numberOfAwakenings')),
            Sleep_Efficiency_Inverted: parseFloat(urlParams.get('Sleep_Efficiency_Inverted')),
            wakeAfterSleepOnset: parseFloat(urlParams.get('wakeAfterSleepOnset'))
        };

        if(window.location.hash) {
            const element = document.querySelector(window.location.hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    createStressSleepVisualization_clickThrough(sleep_data, stress_data, newUserData);
}

function createStressSleepVisualization_clickThrough(initialSleepData, initialStressData, newUserData = null) {
    const container = d3.select('#emotion-chart');
    container.selectAll("*").remove();

    const controlsContainer = container.append('div')
        .attr('class', 'stress-sleep-controls');

    controlsContainer.append('label').text('Stress Metric: ');
    const stressMetricSelect = controlsContainer.append('select').attr('id', 'stress-metric-select');

    controlsContainer.append('label').text('Sleep Metric: ');
    const sleepMetricSelect = controlsContainer.append('select').attr('id', 'sleep-metric-select');

    // Add Trendline Toggle Checkbox
    controlsContainer.append('label')
        .attr('for', 'trendline-toggle')
        .text('Show Trendline:');
    const trendlineToggle = controlsContainer.append('input')
        .attr('type', 'checkbox')
        .attr('id', 'trendline-toggle')
        .property('checked', true); // Set trendline to be on by default

    const margin = { top: 20, right: 30, bottom: 60, left: 80 };

    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    // Add a div for the animation text below the SVG
    const animationTextBox = container.append('div')
        .attr('class', 'stress-animation-textbox')
        .style('width', width + margin.left + margin.right + 'px') // Match SVG width
        .html('Click the chart to advance through the key insights.'); // Initial text

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
    const xAxis = g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height})`);
    const yAxis = g.append('g').attr('class', 'y-axis');
    const xLabel = g.append('text').attr('class', 'x-axis-label').attr('text-anchor', 'middle').attr('x', width / 2).attr('y', height + margin.bottom / 1.5);
    const yLabel = g.append('text').attr('class', 'y-axis-label').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -margin.left / 1.5 + 15);

    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip stress-sleep-tooltip');

    // --- START OF REAL DATA PROCESSING ---
    const processedStressData = (initialStressData || []).map(d => ({
        user_id: d.user_id,
        Daily_stress: d.Daily_stress,
        Avg_Neg_PANAs: d.Avg_Neg_PANAs
    }));

    const processedSleepData = (initialSleepData || []).map(d => ({
        user_id: d.user_id,
        sleepFragmentationIndex: d.sleepFragmentationIndex,
        numberOfAwakenings: d.numberOfAwakenings,
        efficiency: d.efficiency,
        wakeAfterSleepOnset: d.wakeAfterSleepOnset
    }));
    // --- END OF REAL DATA PROCESSING ---

    let currentXMetric, currentYMetric;

    const stressMetrics = [
        { key: 'Daily_stress', label: 'Daily Stress Score' },
        { key: 'Avg_Neg_PANAs', label: 'Avg. Daily Negative Affect (PANAs)' }
    ];
    const sleepMetrics = [
        { key: 'sleepFragmentationIndex', label: 'Sleep Fragmentation Index' },
        { key: 'numberOfAwakenings', label: 'Number of Awakenings' },
        { key: 'Sleep_Efficiency_Inverted', label: 'Sleep Inefficiency (100 - SE%)' },
        { key: 'wakeAfterSleepOnset', label: 'Wake After Sleep Onset (min)' }
    ];

    stressMetricSelect.selectAll('option')
        .data(stressMetrics)
        .join('option')
        .attr('value', d => d.key)
        .text(d => d.label);

    sleepMetricSelect.selectAll('option')
        .data(sleepMetrics)
        .join('option')
        .attr('value', d => d.key)
        .text(d => d.label);

    // --- CLICK-THROUGH LOGIC START ---
    let currentStepIndex = -1; 
    const clickThroughSteps = [
        { stress: 'Daily_stress', sleep: 'numberOfAwakenings' },
        { stress: 'Daily_stress', sleep: 'sleepFragmentationIndex' },
        { stress: 'Daily_stress', sleep: 'Sleep_Efficiency_Inverted' },
        { stress: 'Daily_stress', sleep: 'wakeAfterSleepOnset' },
        { stress: 'Avg_Neg_PANAs', sleep: 'numberOfAwakenings' },
        { stress: 'Avg_Neg_PANAs', sleep: 'sleepFragmentationIndex' },
        { stress: 'Avg_Neg_PANAs', sleep: 'Sleep_Efficiency_Inverted' },
        { stress: 'Avg_Neg_PANAs', sleep: 'wakeAfterSleepOnset' }
    ];
    const stepTexts = [
        "Exploring how daily stress relates to nighttime awakenings. More stress, more wake-ups?",
        "Now, let's see if higher daily stress leads to more fragmented, broken sleep.",
        "Is daily stress making your sleep less efficient? Here's the connection to sleep inefficiency.",
        "Does stress keep you tossing and turning after you finally drift off? Stress vs. WASO.",
        "Switching to negative emotions (PANAs). How do these feelings impact awakenings during sleep?",
        "Are negative emotions throughout the day fracturing your sleep quality at night? PANAs vs. Fragmentation.",
        "Let's examine the link between negative affective states and overall sleep inefficiency.",
        "Finally, how do negative emotions correlate with the time spent awake after sleep onset (WASO)?"
    ];

    function advanceStep() {
        currentStepIndex++;
        if (currentStepIndex < clickThroughSteps.length) {
            const step = clickThroughSteps[currentStepIndex];
            stressMetricSelect.property('value', step.stress);
            sleepMetricSelect.property('value', step.sleep);
            currentXMetric = step.stress;
            currentYMetric = step.sleep;
            let prompt = currentStepIndex < clickThroughSteps.length - 1 ? ' (Click chart to continue)' : '';
            animationTextBox.html(stepTexts[currentStepIndex] + prompt);
            updateChart();
        } else {
            animationTextBox.html('You can now explore the data freely using the dropdowns.');
            svg.on('click', null);
            svg.style('cursor', 'default');
            stressMetricSelect.property('disabled', false);
            sleepMetricSelect.property('disabled', false);
        }
    }
    
    if (newUserData) {
        stressMetricSelect.property('value', 'Daily_stress');
        sleepMetricSelect.property('value', 'numberOfAwakenings');
        stressMetricSelect.property('disabled', false);
        sleepMetricSelect.property('disabled', false);
        svg.style('cursor', 'default');
        animationTextBox.html('Your quiz score is highlighted on the chart. Explore other metrics using the dropdowns.');
        currentXMetric = 'Daily_stress';
        currentYMetric = 'numberOfAwakenings';
        updateChart();
    } else {
        stressMetricSelect.property('disabled', true);
        sleepMetricSelect.property('disabled', true);
        svg.style('cursor', 'pointer');
        svg.on('click', advanceStep);
        advanceStep();
    }
    // --- CLICK-THROUGH LOGIC END ---

    stressMetricSelect.on('change', function () {
        currentXMetric = this.value;
        updateChart();
    });

    sleepMetricSelect.on('change', function () {
        currentYMetric = this.value;
        updateChart();
    });

    trendlineToggle.on('change', function () {
        updateChart();
    });

    function updateChart() {
        let dataForChart = [];
        processedStressData.forEach(sEntry => {
            const matchedSleepEntry = processedSleepData.find(slEntry => slEntry.user_id === sEntry.user_id);
            if (matchedSleepEntry) {
                dataForChart.push({
                    user_id: sEntry.user_id,
                    Daily_stress: sEntry.Daily_stress,
                    Avg_Neg_PANAs: sEntry.Avg_Neg_PANAs,
                    sleepFragmentationIndex: matchedSleepEntry.sleepFragmentationIndex,
                    Sleep_Efficiency_Inverted: matchedSleepEntry.efficiency !== undefined ? (100 - matchedSleepEntry.efficiency) : undefined,
                    wakeAfterSleepOnset: matchedSleepEntry.wakeAfterSleepOnset,
                    numberOfAwakenings: matchedSleepEntry.numberOfAwakenings
                });
            }
        });

        if (newUserData) {
            dataForChart.push(newUserData);
        }

        const filteredForChart = dataForChart.filter(d =>
            d[currentXMetric] !== undefined && !isNaN(d[currentXMetric]) &&
            d[currentYMetric] !== undefined && !isNaN(d[currentYMetric])
        );

        g.selectAll(".no-data-message").remove();

        const xData = filteredForChart.map(d => d[currentXMetric]);
        const yData = filteredForChart.map(d => d[currentYMetric]);

        function getPaddedDomain(dataValues) {
            const [min, max] = d3.extent(dataValues);
            if (min === undefined || max === undefined) return [0, 1];
            if (min === max) {
                if (min === 0) return [-0.5, 0.5];
                const padding = Math.max(Math.abs(min * 0.1), 0.1);
                return [min - padding, max + padding];
            }
            const range = max - min;
            const padding = range * 0.1;
            return [min - padding, max + padding];
        }

        xScale.domain(getPaddedDomain(xData)).nice();
        yScale.domain(getPaddedDomain(yData)).nice();

        xAxis.transition().duration(500).call(d3.axisBottom(xScale));
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));

        if (stressMetricSelect.node() && stressMetricSelect.node().selectedOptions[0]) {
            xLabel.text(stressMetricSelect.node().selectedOptions[0].text);
        }
        if (sleepMetricSelect.node() && sleepMetricSelect.node().selectedOptions[0]) {
            yLabel.text(sleepMetricSelect.node().selectedOptions[0].text);
        }

        const dots = g.selectAll('.dot').data(filteredForChart, d => d.user_id);

        dots.exit().transition().duration(500).attr('r', 0).remove();

        dots.enter().append('circle').attr('class', 'dot')
            .attr('r', 0)
            .attr('cx', d => xScale(d[currentXMetric]))
            .attr('cy', d => yScale(d[currentYMetric]))
            .merge(dots)
            .transition().duration(500)
            .attr('r', d => d.user_id === 'your_score' ? 10 : 6)
            .attr('cx', d => xScale(d[currentXMetric]))
            .attr('cy', d => yScale(d[currentYMetric]))
            .style('fill', d => d.user_id === 'your_score' ? '#ff4136' : '#007bff')
            .style('stroke', d => d.user_id === 'your_score' ? 'white' : 'none')
            .style('stroke-width', d => d.user_id === 'your_score' ? 2 : 0);

        // Trendline Logic
        if (trendlineToggle.property('checked') && filteredForChart.length >= 2) {
            const n = filteredForChart.length;
            const sumX = d3.sum(filteredForChart, d => d[currentXMetric]);
            const sumY = d3.sum(filteredForChart, d => d[currentYMetric]);
            const sumXY = d3.sum(filteredForChart, d => d[currentXMetric] * d[currentYMetric]);
            const sumXX = d3.sum(filteredForChart, d => d[currentXMetric] * d[currentXMetric]);

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            const xDomain = xScale.domain();
            const trendlineData = [
                { x: xDomain[0], y: slope * xDomain[0] + intercept },
                { x: xDomain[1], y: slope * xDomain[1] + intercept }
            ];
            
            const lineGenerator = d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y));

            const trendline = g.selectAll('.trendline')
                .data([trendlineData]);

            trendline.join(
                enter => enter.append('path')
                    .attr('class', 'trendline')
                    .attr('fill', 'none')
                    .attr('stroke', 'red')
                    .attr('stroke-width', 2)
                    .attr('d', lineGenerator)
                    .style('opacity', 0)
                    .call(enter => enter.transition().duration(500).style('opacity', 1).attr('stroke-dasharray', '5,5')),
                update => update
                    .transition()
                    .duration(800)
                    .ease(d3.easeCubicInOut)
                    .attr('d', lineGenerator)
                    .attr('stroke-dasharray', '5,5'),
                exit => exit
                    .transition()
                    .duration(500)
                    .style('opacity', 0)
                    .remove()
            );

        } else {
            g.selectAll('.trendline')
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
        }

        g.selectAll('.dot')
            .on('mouseover', function (event, d) {
                d3.select(this).transition().duration(100);
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`<strong>User ID: ${d.user_id === 'your_score' ? 'Your Score' : d.user_id}</strong><br/>
                    ${stressMetricSelect.node().selectedOptions[0].text}: ${Number(d[currentXMetric]).toFixed(2)}<br/>
                    ${sleepMetricSelect.node().selectedOptions[0].text}: ${Number(d[currentYMetric]).toFixed(2)}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function(event, d) {
                d3.select(this).transition().duration(100).attr('r', d.user_id === 'your_score' ? 10 : 6);
                tooltip.transition().duration(500).style("opacity", 0);
            });
    }
}

// Initalize All Viusualizations on Start-Up.
initStressChart();
initActivityChart();
initIntroductoryMetricsChart();
initHormoneChart();

// --- NEW VISUALIZATION: Daily Activity & Sleep Outcomes ---

// Global variables for the new explorer module
let explorerData = [];
let selectedUserForExplorer = null;


// Function to load all user demographic information (Age, Weight, Height)
async function loadAllUserInfoData() {
    const users = Array.from({ length: 22 }, (_, i) => i + 1);
    const allUserInfo = [];

    for (const userId of users) {
        const filePath = `data/user_data/user_${userId}/user_info.csv`;
        try {
            const data = await d3.csv(filePath);
            if (data && data.length > 0) {
                const userInfo = data[0]; // Assuming one row of data per CSV
                allUserInfo.push({
                    userId: userId,
                    age: userInfo.Age ? Number(userInfo.Age) : null,
                    weight: userInfo.Weight ? Number(userInfo.Weight) : null, // Assuming kg
                    height: userInfo.Height ? Number(userInfo.Height) : null  // Assuming cm
                });
            } else {
                console.warn(`No data found or empty file for user ${userId} at ${filePath}`);
                allUserInfo.push({ userId: userId, age: null, weight: null, height: null });
            }
        } catch (error) {
            console.error(`Error loading user_info.csv for user ${userId}:`, error);
            allUserInfo.push({ userId: userId, age: null, weight: null, height: null });
        }
    }
    return allUserInfo;
}


// Function to load Actigraph data and calculate total daily steps for all users
async function loadAllUsersDailySteps() {
    const users = Array.from({ length: 22 }, (_, i) => i + 1);
    const allUserSteps = [];

    for (const userId of users) {
        try {
            // Assuming loadActigraphData is already defined and returns data with a 'steps' field for each entry
            const actigraphData = await loadActigraphData(userId);
            if (actigraphData && actigraphData.length > 0) {
                const totalSteps = d3.sum(actigraphData, d => d.steps);
                allUserSteps.push({ userId: userId, totalDailySteps: totalSteps });
            }
        } catch (error) {
            console.error(`Error loading actigraph data for user ${userId}:`, error);
            // Optionally add a placeholder or skip user
            allUserSteps.push({ userId: userId, totalDailySteps: 0 }); 
        }
    }
    return allUserSteps;
}

// Function to process and combine daily activity with sleep data
async function processCombinedActivitySleepData() {
    const dailyStepsData = await loadAllUsersDailySteps(); // This gives { userId, totalDailySteps }
    const sleepMetricsData = await loadSleepData(); // Uses existing function
    const allUserRawActigraphData = await loadAllUsersData(); // To get raw actigraph for active minutes
    const allUserInfo = await loadAllUserInfoData(); // Load demographic data

    const combinedData = dailyStepsData.map(activityUser => {
        const matchingSleepUserEntries = sleepMetricsData.filter(sleepUser => sleepUser.user_id === activityUser.userId);
        const userRawActigraph = allUserRawActigraphData[activityUser.userId - 1] || [];
        const userInfo = allUserInfo.find(info => info.userId === activityUser.userId);

        // Calculate Active Minutes: count of unique minutes where steps > 0
        let activeMinutes = 0;
        if (userRawActigraph.length > 0) {
            const activeMinuteTimestamps = new Set();
            userRawActigraph.forEach(record => {
                if (record.steps > 0 && record.time) {
                    const timeParts = record.time.split(':');
                    if (timeParts.length >= 2) { // Ensure we have at least HH:MM
                        const hourMinute = `${timeParts[0]}:${timeParts[1]}`;
                        activeMinuteTimestamps.add(hourMinute);
                    }
                }
            });
            activeMinutes = activeMinuteTimestamps.size;
        }

        let age = null;
        let bmi = null;
        if (userInfo) {
            age = userInfo.age;
            if (userInfo.weight && userInfo.height && userInfo.height > 0) {
                bmi = userInfo.weight / ((userInfo.height / 100) ** 2);
            }
        }

        if (matchingSleepUserEntries.length > 0) {
            const avgEfficiency = d3.mean(matchingSleepUserEntries, d => d.efficiency);
            const avgTST = d3.mean(matchingSleepUserEntries, d => d.totalSleepTime);
            const avgLatency = d3.mean(matchingSleepUserEntries, d => d.latency);
            const avgWASO = d3.mean(matchingSleepUserEntries, d => d.wakeAfterSleepOnset);
            const avgNumberOfAwakenings = d3.mean(matchingSleepUserEntries, d => d.numberOfAwakenings);

            return {
                userId: activityUser.userId,
                totalDailySteps: activityUser.totalDailySteps,
                activeMinutes: activeMinutes,
                avgEfficiency: avgEfficiency,
                avgTST: avgTST, // in minutes
                age: age,
                bmi: bmi,
                avgLatency: avgLatency,
                avgWASO: avgWASO,
                avgNumberOfAwakenings: avgNumberOfAwakenings
            };
        }
        // Fallback if no sleep entries, still try to return activity and demo data
        return {
            userId: activityUser.userId,
            totalDailySteps: activityUser.totalDailySteps,
            activeMinutes: activeMinutes,
            avgEfficiency: null,
            avgTST: null,
            age: age,
            bmi: bmi,
            avgLatency: null,
            avgWASO: null,
            avgNumberOfAwakenings: null
        };
    }).filter(d => d !== null && d.totalDailySteps !== undefined); // Keep if steps data is present

    const filteredCombinedData = combinedData.filter(d => d.userId !== 11);

    return filteredCombinedData;
}

// --- RENAMED MODULE: Daily Activity Parallel Coordinates Plot --- 

function getActivityLevel(totalDailySteps) {
    if (totalDailySteps >= 10000) return "High";
    if (totalDailySteps >= 5000) return "Moderate";
    return "Lower";
}

// Function to populate the PCP axis selector div
function populatePcpAxisSelector(allDimensions, activeDimensionKeys, onDimensionToggleCallback) {
    const axisSelectorDiv = document.getElementById('pcp-current-axis-selector');
    if (!axisSelectorDiv) {
        console.error('PCP axis selector div not found!');
        return;
    }
    axisSelectorDiv.innerHTML = ''; // Clear previous content

    allDimensions.forEach(dim => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('pcp-axis-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `pcp-axis-checkbox-${dim.key}`;
        checkbox.name = dim.name;
        checkbox.value = dim.key;
        checkbox.checked = activeDimensionKeys.includes(dim.key);

        checkbox.addEventListener('change', () => {
            if (onDimensionToggleCallback) {
                onDimensionToggleCallback(dim.key, checkbox.checked);
            }
        });

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = dim.name;

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        axisSelectorDiv.appendChild(itemDiv);
    });
}

// Will be called by renderDailyActivityPCPChart
function drawPCPForExperiment(dataToDraw, targetDivId, currentSelectedUserId, updateSelectedUserCallback, dimensionsToDisplay) { 
    const visArea = d3.select(targetDivId); 
    visArea.selectAll('*').remove(); 

    if (!dataToDraw || dataToDraw.length === 0) {
        visArea.html("<p>No data to display for the selected filters.</p>");
        return;
    }
    
    if (!dimensionsToDisplay || dimensionsToDisplay.length === 0) {
        visArea.html("<p>No dimensions selected or available for PCP.</p>");
        // The following two lines that cleared the axis selector are removed.
        return;
    }

    let selectedPathElement = null; 

    const margin = { top: 60, right: 60, bottom: 50, left: 80 }; 
    const parentWidth = visArea.node() ? visArea.node().getBoundingClientRect().width : 900;
    const width = Math.max(parentWidth, 700) - margin.left - margin.right;
    const height = 480 - margin.top - margin.bottom;

    const svg = visArea.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const activityColors = {
        "High": "#2ca02c",
        "Moderate": "#1f77b4",
        "Lower": "#888888"
    };

    const xScale = d3.scalePoint()
        .domain(dimensionsToDisplay.map(d => d.name))
        .range([0, width])
        .padding(0.15);

    dimensionsToDisplay.forEach(dim => {
        // Ensure the scale's range is correctly set for the current height
        dim.scale.range([height, 0]); 

        const extent = d3.extent(dataToDraw, d => d[dim.key]);
        const paddingPercentage = 0.1; 
        let lowerBound = extent[0];
        let upperBound = extent[1];

        if (lowerBound === undefined || upperBound === undefined || lowerBound === null || upperBound === null || isNaN(lowerBound) || isNaN(upperBound)) {
            dim.scale.domain([0, 1]).nice();
        } else if (lowerBound === upperBound) {
            const paddingValue = Math.abs(lowerBound * paddingPercentage) || 0.1; 
            dim.scale.domain([lowerBound - paddingValue, upperBound + paddingValue]).nice();
        } else {
            const range = upperBound - lowerBound;
            const paddingValue = range * paddingPercentage;
            dim.scale.domain([Math.max(0, lowerBound - paddingValue), upperBound + paddingValue]).nice();
        }
        
        if (dim.key === "avgEfficiency") {
             dim.scale.domain([Math.min(50, d3.min(dataToDraw, d => d.avgEfficiency) || 50) , 100]).nice();
        }
        if (dim.key === "bmi") {
            const bmiExtent = d3.extent(dataToDraw.map(d => d.bmi).filter(d => d !== null && !isNaN(d)));
            let minBmi = bmiExtent[0] !== undefined ? bmiExtent[0] : 10;
            let maxBmi = bmiExtent[1] !== undefined ? bmiExtent[1] : 40;
             if (minBmi === maxBmi) {
                minBmi = Math.max(10, minBmi - 5);
                maxBmi = maxBmi + 5;
            } else {
                minBmi = Math.max(10, minBmi - ( (maxBmi-minBmi) *0.1) ); 
                maxBmi = maxBmi + ( (maxBmi-minBmi) *0.1);
            }
            dim.scale.domain([minBmi, maxBmi]).nice();
        }
         if (dim.key === "age") {
            const ageExtent = d3.extent(dataToDraw.map(d => d.age).filter(d => d !== null && !isNaN(d)));
            let minAge = ageExtent[0] !== undefined ? ageExtent[0] : 18;
            let maxAge = ageExtent[1] !== undefined ? ageExtent[1] : 70;
            if (minAge === maxAge) {
                minAge = Math.max(18, minAge - 5);
                maxAge = maxAge + 5;
            } else {
                 minAge = Math.max(18, minAge - ( (maxAge-minAge) *0.1) );
                 maxAge = maxAge + ( (maxAge-minAge) *0.1);
            }
            dim.scale.domain([minAge, maxAge]).nice();
        }
    });

    const line = d3.line()
        .defined(p => p[1] != null && !isNaN(p[1]))
        .x(p => p[0])
        .y(p => p[1]);

    const paths = svg.append('g').attr("class", "pcp-user-paths")
        .selectAll("path")
        .data(dataToDraw, d => d.userId)
        .join(
            enter => enter.append("path")
                .attr("d", d => line(dimensionsToDisplay.map(dim => [xScale(dim.name), dim.scale(d[dim.key])])))
                .attr("class", "pcp-user-line") 
                .classed('activity-high', d => getActivityLevel(d.totalDailySteps) === "High")
                .classed('activity-moderate', d => getActivityLevel(d.totalDailySteps) === "Moderate")
                .classed('activity-lower', d => getActivityLevel(d.totalDailySteps) === "Lower")
                .style("fill", "none")
                .each(function() { 
                    const length = this.getTotalLength();
                    if (length > 0) { 
                        d3.select(this)
                            .attr("stroke-dasharray", `${length},${length}`)
                            .attr("stroke-dashoffset", length); 
                    }
                }),
            update => update
                .attr("d", d => line(dimensionsToDisplay.map(dim => [xScale(dim.name), dim.scale(d[dim.key])])))
                .classed('activity-high', d => getActivityLevel(d.totalDailySteps) === "High")
                .classed('activity-moderate', d => getActivityLevel(d.totalDailySteps) === "Moderate")
                .classed('activity-lower', d => getActivityLevel(d.totalDailySteps) === "Lower")
                .each(function() { 
                    const length = this.getTotalLength();
                     if (length > 0) { 
                        d3.select(this)
                            .attr("stroke-dasharray", `${length},${length}`)
                            .attr("stroke-dashoffset", length); 
                    }
                }),
            exit => exit.remove()
        );

    const axes = svg.selectAll(".pcp-dimension-axis")
        .data(dimensionsToDisplay)
        .join("g")
        .attr("class", "pcp-dimension-axis")
        .attr("transform", d => `translate(${xScale(d.name)},0)`);
    
    axes.append("g")
        .attr("class", "pcp-axis")
        .each(function(d) { d3.select(this).call(d3.axisLeft(d.scale).ticks(6).tickFormat(d.format)); })
        .append("text")
        .attr("class", "pcp-axis-title")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 30)
        .attr("x", -(height / 2))
        .style("text-anchor", "middle")
        .text(d => d.name);

    axes.append("g")
        .attr("class", "pcp-brush-target")
        .attr("x", -15).attr("width", 30).attr("height", height)
        .style("fill", "none").style("pointer-events", "all");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip pcp-experiment-tooltip")
        .style("opacity", 0);

    function showPCPTooltip(event, d) {
        tooltip.transition().duration(200).style('opacity', .9);
        let tooltipHtml = `<strong>User ID: ${d.userId}</strong><br/>`;
        dimensionsToDisplay.forEach(dim => {
            const val = d[dim.key];
            const displayVal = dim.format ? dim.format(val) : (typeof val === 'number' ? val.toFixed(1) : (val === null || val === undefined ? "N/A" : val));
            tooltipHtml += `${dim.name.trim()}: ${displayVal}<br/>`;
        });
        tooltip.html(tooltipHtml)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    function hidePCPTooltip() {
        tooltip.transition().duration(500).style('opacity', 0);
    }

    paths
        .on('mouseover', function(event, d) {
            const currentElement = d3.select(this);
            if (selectedPathElement !== this) { 
                currentElement.classed('hovered', true);
            }
            showPCPTooltip(event, d); 
        })
        .on('mouseout', function() {
            d3.select(this).classed('hovered', false);
            hidePCPTooltip(); 
        })
        .on('click', function(event, d) {
            const clickedPathElement = this;
            const clickedUserId = d.userId;

            if (currentSelectedUserId === clickedUserId) {
                updateSelectedUserCallback(null);
                if(selectedPathElement) d3.select(selectedPathElement).classed('selected', false);
                selectedPathElement = null;
            } else {
                updateSelectedUserCallback(clickedUserId);
                if(selectedPathElement) d3.select(selectedPathElement).classed('selected', false);
                d3.select(clickedPathElement).classed('selected', true).raise();
                selectedPathElement = clickedPathElement;
            }
            event.stopPropagation(); 
        });

    selectedPathElement = null; 
    if (currentSelectedUserId !== null) {
        paths.each(function(d_path) {
            if (d_path.userId === currentSelectedUserId) {
                d3.select(this).classed('selected', true).raise();
                selectedPathElement = this; 
            }
        });
    }

    svg.on('click', function() {
        if (currentSelectedUserId !== null) { 
            updateSelectedUserCallback(null); 
            if (selectedPathElement) {
                d3.select(selectedPathElement).classed('selected', false);
                selectedPathElement = null;
            }
        }
    });

    axes.select(".pcp-brush-target")
        .each(function(d_dim) {
            d3.select(this).call(d_dim.brush = d3.brushY()
                .extent([[-15, 0], [15, height]])
                .on("start brush end", (event) => brushed(event, d_dim, dataToDraw, dimensionsToDisplay, paths, axes, xScale)));
        });
    
    function brushed({ selection }, brushed_dim, allData, pcpDimensions, pcpPaths, pcpAxes, localXScale) {
        const activeBrushes = [];
        pcpAxes.each(function(axisData) { 
            const brushElement = d3.select(this).select(".pcp-brush-target").node();
            if (brushElement) { 
                const brushSelection = d3.brushSelection(brushElement);
                if (brushSelection) {
                    activeBrushes.push({ dimension: axisData, range: brushSelection });
                }
            }
        });

        if (activeBrushes.length === 0) {
            pcpPaths.classed("brushed-active", false).classed("brushed-inactive", false);
            return;
        }

        let activeCount = 0;
        pcpPaths.each(function(d_path) {
            const pathElement = d3.select(this);
            const isActive = activeBrushes.every(brush => {
                if (!d_path || !brush.dimension || !brush.dimension.key) return false;
                const val = d_path[brush.dimension.key];
                if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) return false; 
                const yPos = brush.dimension.scale(val);
                if (yPos === undefined || isNaN(yPos)) return false;
                return brush.range[0] <= yPos && yPos <= brush.range[1];
            });
            if (isActive) activeCount++;
            pathElement.classed("brushed-active", isActive).classed("brushed-inactive", !isActive);
        });
    }

    const legendData = Object.entries(activityColors).map(([level, color]) => ({level, color}));
    const legend = svg.append("g")
        .attr("class", "pcp-legend")
        .attr("transform", `translate(0, ${-margin.top + 5})`);
    const legendItems = legend.selectAll(".pcp-legend-item").data(legendData).join("g")
        .attr("class", "pcp-legend-item")
        .attr("transform", (d, i) => `translate(${i * 150}, 0)`);
    legendItems.append("rect").attr("x", 0).attr("y", 0).attr("width", 15).attr("height", 15).style("fill", d => d.color);
    legendItems.append("text").attr("x", 20).attr("y", 12).text(d => `${d.level} Activity`).style("font-size", "12px").style("fill", "#ffffff");
}

async function renderDailyActivityPCPChart() {
    const combinedData = await processCombinedActivitySleepData();
    if (!combinedData || combinedData.length === 0) {
        console.warn("Daily Activity PCP: No combined activity and sleep data to render.");
        d3.select("#daily-activity-pcp-visualization-area").html("<p>No data available for this visualization.</p>");
        // Also clear the axis selector if no data
        const axisSelectorDiv = document.getElementById('pcp-current-axis-selector');
        if (axisSelectorDiv) axisSelectorDiv.innerHTML = '';
        return;
    }

    const allPcpDimensions = [
        { name: "Daily Steps", key: "totalDailySteps", scale: d3.scaleLinear(), format: d3.format(".0f") },
        { name: "Active Minutes", key: "activeMinutes", scale: d3.scaleLinear(), format: d3.format(".0f") },
        { name: "BMI", key: "bmi", scale: d3.scaleLinear(), format: d3.format(".1f") },
        { name: "Sleep Efficiency (%)", key: "avgEfficiency", scale: d3.scaleLinear(), format: d3.format(".1f") },
        { name: "TST (min)", key: "avgTST", scale: d3.scaleLinear(), format: d3.format(".0f") },
        { name: "WASO (min)", key: "avgWASO", scale: d3.scaleLinear(), format: d3.format(".0f") },
        { name: "Awakenings (#)", key: "avgNumberOfAwakenings", scale: d3.scaleLinear(), format: d3.format(".0f") },
        { name: "Latency (min)", key: "avgLatency", scale: d3.scaleLinear(), format: d3.format(".0f") }
    ];

    let activePcpDimensionKeys = ["totalDailySteps", "bmi", "avgEfficiency", "avgTST"]; 
    let currentDataForPCP = [...combinedData]; 
    let selectedUserIdForPCP = null; 

    let currentEfficiencyFilter = () => true;

    const lockoutContainer = d3.select('#pcp-interaction-lockout');
    const explainerBox = d3.select('#pcp-explainer-box');
    let isLocked = true;

    function applyFiltersAndRedraw() {
        currentDataForPCP = combinedData.filter(currentEfficiencyFilter);
        redrawPCP();
    }

    // DOM Manipulation for Dropdown (run once)
    const pcpContainer = document.getElementById('daily-activity-pcp-container');
    const pcpSelectorDiv = document.getElementById('pcp-current-axis-selector');
    const controlsDiv = document.getElementById('daily-activity-pcp-controls');

    if (pcpContainer && pcpSelectorDiv && controlsDiv && !document.getElementById('pcp-axis-toggle-button')) {
        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.id = 'pcp-axis-selector-container';

        const toggleButton = document.createElement('button');
        toggleButton.id = 'pcp-axis-toggle-button';
        toggleButton.textContent = 'Select Axes ▾'; // Initial state: closed

        pcpSelectorDiv.classList.add('hidden'); // Start hidden
        
        dropdownWrapper.appendChild(toggleButton);
        dropdownWrapper.appendChild(pcpSelectorDiv); // Move existing selector into wrapper

        // Insert the dropdown structure before the filter controls div
        pcpContainer.insertBefore(dropdownWrapper, controlsDiv);

        toggleButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from immediately closing due to document listener
            pcpSelectorDiv.classList.toggle('hidden');
            toggleButton.textContent = pcpSelectorDiv.classList.contains('hidden') ? 'Select Axes ▾' : 'Select Axes ▴';
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', function(event) {
            if (!dropdownWrapper.contains(event.target) && !pcpSelectorDiv.classList.contains('hidden')) {
                pcpSelectorDiv.classList.add('hidden');
                toggleButton.textContent = 'Select Axes ▾';
            }
        });
    } else if (pcpSelectorDiv && document.getElementById('pcp-axis-toggle-button')) {
        // If structure exists, ensure selector div starts hidden (e.g. on a full page reload but JS re-runs)
        // And button text is correct.
        const toggleButton = document.getElementById('pcp-axis-toggle-button');
        if (!pcpSelectorDiv.classList.contains('hidden')) {
            // This case might occur if JS re-runs and the div was left open from a previous state without full reload.
            // Or if some other script/CSS removes 'hidden' by default after DOM load.
            // For safety, ensure consistency on re-run.
        } 
        // Ensure button text matches state on subsequent calls (though redrawPCP handles populating it)
        if(toggleButton) toggleButton.textContent = pcpSelectorDiv.classList.contains('hidden') ? 'Select Axes ▾' : 'Select Axes ▴';
    }

    if (isLocked) {
        lockoutContainer.style('position', 'relative');
        
        const overlay = lockoutContainer.append('div')
            .attr('class', 'pcp-overlay')
            .style('position', 'absolute')
            .style('top', 0)
            .style('left', 0)
            .style('width', '100%')
            .style('height', '100%')
            .style('background', 'rgba(0,0,0,0.0)')
            .style('cursor', 'pointer')
            .style('z-index', 10);

        let clickCount = 0;
        const messages = [
            "<p>Let's see how a healthy and active lifestyle can affect the sleep of all the users! Here each colored line represents a user and how there health and activity translates to sleep metrics.<br><strong>Click to continue.</strong></p>",
            "<p>Filtering for good sleep efficiency, we can see that users with good sleep efficiency (85% or higher) have generally high daily step counts. Do you notice any patterns?<br><strong>Click to continue.</strong></p>",
            "<p>Now let's highlight two users to see how their sleep metrics compare. User 17 has a higher sleep efficency score than User 3 though User 3 has a higher daily step count. We may think that that's odd but looking a our heatmap we know that user 3 engaged in heavy activity just prior to sleep, which can actually have a negative affect on sleep.<br><strong>Click to continue.</strong></p>",
            "<p>Brushing over BMI, allows us too see the affects of activity and sleep on user that are a 'healthy' weight. Here the pattern is clear, all of our users have high steps counts compared to the 5296 step average in Italy as of 2017 and amongst the user in the healthy weight range, we see that most have a sleep effiency above 83%.<br><strong>Click to continue.</strong></p>",
            "<p>Let's see how a new metric, sleep latency, can help us understand the sleep of our users. Latency is the time it takes for a user to fall asleep. We see that all our users have a latency of 0 minutes, which means they fall asleep immediately after getting into bed.<br><strong>Click to continue.</strong></p>",
            "<p>Now let's brush latency at 0 minutes. This will highlight users that fall asleep immediately after getting into bed. The pattern becomes clear, user with low sleep latency have higher sleep efficiency scores, and in a healthy weight range.<br><strong>Click to continue.</strong></p>",
            "<p>Now let's brush TST for 275-400 minutes. This will highlight users that have a sleep duration of 275-400 minutes, and have a latency of 0 minutes. We see that our high step count users are not within this group as a result of strenous activity just prior to sleep.<br><strong>Now that you have a sense of how the PCP can help you understand the sleep of your users, explore what other patterns you can extract with additional metrics.</strong></p>",
        ];

        explainerBox.html(messages[0]).style('display', 'block');

        overlay.on('click', () => {
            clickCount++;
            
            console.log("Click count:", clickCount, "Messages length:", messages.length);
            
            // Cleanup previous interactive step artifacts
            d3.selectAll(".tutorial-tooltip").remove();
            d3.selectAll("path.pcp-user-line")
                .style('stroke', null)
                .style('stroke-width', null)
                .style('stroke-opacity', null);

            if (clickCount < messages.length) {
                explainerBox.html(messages[clickCount]);
                console.log("Showing message for click", clickCount);

                if (clickCount === 1) { // 2nd box
                    console.log("Executing step 1 (efficiency filter)");
                    // Programmatically filter for 'Good' efficiency
                    currentEfficiencyFilter = (d) => d.avgEfficiency > 85;
                    applyFiltersAndRedraw();
                    d3.select('#efficiency-filter').property('value', 'good');
                } else if (clickCount === 2) { // 3rd box
                    console.log("Executing step 2 (highlight users)");
                    // Reset filter to ensure all users are visible for this step
                    d3.select('#efficiency-filter').property('value', 'all');
                    currentEfficiencyFilter = () => true;
                    applyFiltersAndRedraw();

                    const usersToShow = [3, 17];
                    const tutorialColors = { 3: "Magenta", 17: "#FF5C00" }; // Orange and Blue
                    const paths = d3.selectAll("path.pcp-user-line");

                    paths.filter(d => usersToShow.includes(d.userId))
                        .style('stroke', d => tutorialColors[d.userId])
                        .style('stroke-width', '4.5px')
                        .style('stroke-opacity', 1)
                        .raise();

                    const dimensionsToDisplay = allPcpDimensions.filter(dim => activePcpDimensionKeys.includes(dim.key));

                    paths.filter(d => usersToShow.includes(d.userId)).each(function(d, i) {
                        const pathElement = this;
                        const midPoint = pathElement.getPointAtLength(pathElement.getTotalLength() / 2);
                        const svgElement = d3.select('#daily-activity-pcp-visualization-area svg').node();
                        const svgRect = svgElement.getBoundingClientRect();

                        const tooltip = d3.select("body").append("div")
                            .attr("class", "tooltip pcp-experiment-tooltip tutorial-tooltip")
                            .style("opacity", 0)
                            .style("background-color", tutorialColors[d.userId]);
                        
                        tooltip.transition().duration(200).style('opacity', .9);
                        
                        let tooltipHtml = `<strong>User ID: ${d.userId}</strong><br/>`;
                        dimensionsToDisplay.forEach(dim => {
                            const val = d[dim.key];
                            const displayVal = dim.format ? dim.format(val) : (typeof val === 'number' ? val.toFixed(1) : (val === null || val === undefined ? "N/A" : val));
                            tooltipHtml += `${dim.name.trim()}: ${displayVal}<br/>`;
                        });

                        const tooltipLeft = svgRect.left + window.scrollX + midPoint.x - 75;
                        const tooltipTop = svgRect.top + window.scrollY + midPoint.y - (i === 0 ? 120 : -20) ;
                        
                        tooltip.html(tooltipHtml)
                            .style('left', tooltipLeft + 'px')
                            .style('top', tooltipTop + 'px');
                    });
                } else if (clickCount === 3) { // 4th box
                    console.log("Executing step 3 (BMI brush)");
                    const bmiDim = allPcpDimensions.find(d => d.key === 'bmi');
                    if (!bmiDim) {
                        console.error("BMI dimension not found for tutorial.");
                        return;
                    }

                    const axes = d3.selectAll(".pcp-dimension-axis");
                    const bmiAxis = axes.filter(d => d.key === 'bmi');

                    if (bmiAxis.empty() || !bmiDim.brush) {
                        console.error("BMI axis or brush not found for tutorial.");
                        return;
                    }

                    const bmiBrushTarget = bmiAxis.select('.pcp-brush-target');
                    if (bmiBrushTarget.empty()) {
                        console.error("BMI brush target element not found.");
                        return;
                    }

                    const yRange = [bmiDim.scale(24.9), bmiDim.scale(18.5)];
                    bmiBrushTarget.call(bmiDim.brush.move, yRange);

                } else if (clickCount === 4) { // 5th box
                    console.log("Executing step 4 (add latency axis)");
                    // Clear brush from previous step - with better error handling
                    try {
                        const axes = d3.selectAll(".pcp-dimension-axis");
                        axes.each(function(d_dim) {
                            if (d_dim && d_dim.brush) {
                                try {
                                    d3.select(this).call(d_dim.brush.move, null);
                                } catch (brushError) {
                                    console.warn("Could not clear brush for dimension:", d_dim.key, brushError);
                                }
                            }
                        });
                    } catch (e) {
                        console.warn("Error clearing brushes:", e);
                    }

                    // Hard code adding latency axis
                    console.log("Before adding latency:", activePcpDimensionKeys);
                    if (!activePcpDimensionKeys.includes('avgLatency')) {
                        activePcpDimensionKeys.push('avgLatency');
                        console.log("After adding latency:", activePcpDimensionKeys);
                        
                        // Clear the existing chart first
                        d3.select("#daily-activity-pcp-visualization-area").selectAll("*").remove();
                        
                        // Directly redraw the chart with new dimensions
                        const dimensionsToDisplay = allPcpDimensions.filter(dim => activePcpDimensionKeys.includes(dim.key));
                        drawPCPForExperiment(
                            currentDataForPCP, 
                            "#daily-activity-pcp-visualization-area", 
                            selectedUserIdForPCP, 
                            updateSelectedUserCallback, 
                            dimensionsToDisplay
                        );
                        
                        // Add line animation setup to make lines visible
                        const svg = d3.select("#daily-activity-pcp-visualization-area svg");
                        if (svg.node()) {
                            const paths = svg.selectAll("path.pcp-user-line");
                            if (!paths.empty()) {
                                paths.each(function() { 
                                    if (this && typeof this.getTotalLength === 'function') {
                                        const length = this.getTotalLength();
                                        if (length > 0) {
                                             d3.select(this)
                                            .attr("stroke-dasharray", `${length},${length}`)
                                            .attr("stroke-dashoffset", length);
                                        } else {
                                             d3.select(this)
                                            .attr("stroke-dasharray", "none")
                                            .attr("stroke-dashoffset", "0");
                                        }
                                    }
                                });
                                animatePCPLines(paths);
                            }
                        }
                        
                        // Manually populate the axis selector
                        populatePcpAxisSelector(allPcpDimensions, activePcpDimensionKeys, handleDimensionToggle);
                        
                        console.log("Hard coded chart redraw complete");
                    }
                } else if (clickCount === 5) { // 6th box - brush latency at 0
                    console.log("Executing step 5 (brush latency at 0)");
                    
                    // Find the latency dimension and brush it at 0
                    const latencyDim = allPcpDimensions.find(d => d.key === 'avgLatency');
                    if (latencyDim) {
                        const axes = d3.selectAll(".pcp-dimension-axis");
                        const latencyAxis = axes.filter(d => d.key === 'avgLatency');

                        if (!latencyAxis.empty() && latencyDim.brush) {
                            const latencyBrushTarget = latencyAxis.select('.pcp-brush-target');
                            if (!latencyBrushTarget.empty()) {
                                // Brush from 0 to 0.5 minutes (very low latency)
                                const yRange = [latencyDim.scale(0.5), latencyDim.scale(0)];
                                latencyBrushTarget.call(latencyDim.brush.move, yRange);
                                console.log("Applied latency brush at 0-0.5 minutes");
                            }
                        }
                    }
                } else if (clickCount === 6) { // 7th box - brush TST for 275-400 minutes
                    console.log("Executing step 6 (brush TST for 275-400 minutes)");
                    
                    // Find the TST dimension and brush it for 275-400 minutes
                    const tstDim = allPcpDimensions.find(d => d.key === 'avgTST');
                    if (tstDim) {
                        const axes = d3.selectAll(".pcp-dimension-axis");
                        const tstAxis = axes.filter(d => d.key === 'avgTST');

                        if (!tstAxis.empty() && tstDim.brush) {
                            const tstBrushTarget = tstAxis.select('.pcp-brush-target');
                            if (!tstBrushTarget.empty()) {
                                // Brush from 275 to 400 minutes (optimal sleep duration)
                                const yRange = [tstDim.scale(400), tstDim.scale(275)];
                                tstBrushTarget.call(tstDim.brush.move, yRange);
                                console.log("Applied TST brush at 275-400 minutes");
                            }
                        }
                    }
                }

            } else {
                // Last annotation box disappears, PCP resets, interaction is enabled
                isLocked = false;
                overlay.remove();
                explainerBox.style('display', 'none');
                
                // Reset PCP to original default state (remove latency that was added during tutorial)
                activePcpDimensionKeys = ["totalDailySteps", "bmi", "avgEfficiency", "avgTST"];
                selectedUserIdForPCP = null;
                d3.select('#efficiency-filter').property('value', 'all');
                currentEfficiencyFilter = () => true;

                // Final cleanup of all tutorial artifacts
                d3.selectAll(".tutorial-tooltip").remove();
                d3.selectAll("path.pcp-user-line")
                    .style('stroke', null)
                    .style('stroke-width', null)
                    .style('stroke-opacity', null);

                // Clear all brushes
                const axes = d3.selectAll(".pcp-dimension-axis");
                axes.each(function(d_dim) {
                    if (d_dim && d_dim.brush) {
                        try {
                            d3.select(this).call(d_dim.brush.move, null);
                        } catch (brushError) {
                            console.warn("Could not clear brush for dimension:", d_dim.key, brushError);
                        }
                    }
                });
                
                // Redraw with original settings and enable interactions
                applyFiltersAndRedraw();
                populatePcpAxisSelector(allPcpDimensions, activePcpDimensionKeys, handleDimensionToggle);
                
                // Enable all interactions
                d3.selectAll('#daily-activity-pcp-visualization-area .brush').style('pointer-events', 'all');
                d3.select('#pcp-axis-toggle-button').property('disabled', false);
                d3.select('#efficiency-filter').property('disabled', false);
                
                console.log("Tutorial complete - PCP reset to original state with interactions enabled");
            }
        });
    }

    function updateSelectedUserCallback(userId) {
        selectedUserIdForPCP = userId;
    }

    function handleDimensionToggle(dimensionKey, isChecked) {
        // Prevent deselecting below 2 active axes
        if (!isChecked && activePcpDimensionKeys.length <= 2) {
            console.warn("Minimum of 2 axes required. Cannot deselect further.");
            // Re-check the box visually as the change is disallowed
            const checkbox = document.querySelector(`#pcp-axis-selector-container input[data-key="${dimensionKey}"]`);
            if (checkbox) checkbox.checked = true;
            return;
        }

        if (isChecked) {
            if (!activePcpDimensionKeys.includes(dimensionKey)) {
                activePcpDimensionKeys.push(dimensionKey);
            }
        } else {
            // This part is reached only if deselecting is allowed (i.e., activePcpDimensionKeys.length > 2)
            activePcpDimensionKeys = activePcpDimensionKeys.filter(key => key !== dimensionKey);
        }
        
        activePcpDimensionKeys.sort((a, b) => 
            allPcpDimensions.findIndex(dim => dim.key === a) - 
            allPcpDimensions.findIndex(dim => dim.key === b)
        );
        redrawPCP();
    }

    function redrawPCP() {
        const dimensionsToDisplay = allPcpDimensions.filter(dim => activePcpDimensionKeys.includes(dim.key));
        
        populatePcpAxisSelector(allPcpDimensions, activePcpDimensionKeys, handleDimensionToggle);
        
        drawPCPForExperiment(
            currentDataForPCP, 
            "#daily-activity-pcp-visualization-area", 
            selectedUserIdForPCP, 
            updateSelectedUserCallback, 
            dimensionsToDisplay
        );
        
        if (isLocked) {
            d3.selectAll('#daily-activity-pcp-visualization-area .brush').style('pointer-events', 'none');
        }
        
        const svg = d3.select("#daily-activity-pcp-visualization-area svg");
        if (svg.node()) {
            const paths = svg.selectAll("path.pcp-user-line");
            if (!paths.empty()) {
                 paths.each(function() { 
                    if (this && typeof this.getTotalLength === 'function') {
                        const length = this.getTotalLength();
                        if (length > 0) {
                             d3.select(this)
                            .attr("stroke-dasharray", `${length},${length}`)
                            .attr("stroke-dashoffset", length);
                        } else {
                            // Handle zero-length paths explicitly if needed, e.g., hide or minimal dash
                             d3.select(this)
                            .attr("stroke-dasharray", "none")
                            .attr("stroke-dashoffset", "0");
                        }
                    }
                });
                // if (!isLocked) { // Now we always animate, but only after drawing
                animatePCPLines(paths);
                // }
            }
        }
    }

    // Initial Filter Setup
    const controlsContainer = d3.select('#daily-activity-pcp-controls');
    controlsContainer.html(`
        <div class="filter-group">
            <label for="efficiency-filter">Sleep Efficiency:</label>
            <select id="efficiency-filter">
                <option value="all">All Levels</option>
                <option value="good">Good (>85%)</option>
                <option value="fair">Fair (75-85%)</option>
                <option value="poor">Poor (<75%)</option>
            </select>
        </div>
    `);

    d3.select('#pcp-axis-toggle-button').property('disabled', isLocked);
    d3.select('#efficiency-filter').property('disabled', isLocked);

    d3.select('#efficiency-filter').on('change', function() {
        const selectedValue = this.value;
        currentEfficiencyFilter = (d) => {
            if (selectedValue === 'good') return d.avgEfficiency > 85;
            if (selectedValue === 'fair') return d.avgEfficiency >= 75 && d.avgEfficiency <= 85;
            if (selectedValue === 'poor') return d.avgEfficiency < 75;
            return true; // 'all'
        };
        applyFiltersAndRedraw();
    });

    redrawPCP(); // Initial drawing
}

async function initDailyActivityPCPChart() { 
    await renderDailyActivityPCPChart();
}

// Initialize the Daily Activity PCP Chart
initDailyActivityPCPChart(); // RENAMED call

// --- NEW MODULE: Activity Fingerprint & Sleep Quality Explorer ---
// ... existing code ...

// Initialize Scrollama and other visual components that might need to wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    // Animate the intro text
    const leadElement = document.querySelector('.lead');
    const groupNamesElement = document.querySelector('.group-names');
    if (leadElement) {
        setTimeout(() => leadElement.classList.add('visible'), 100);
    }
    if (groupNamesElement) {
        // The delay is already in the CSS, but this ensures it starts after the lead element
        setTimeout(() => groupNamesElement.classList.add('visible'), 100);
    }

    initializeApp();
});