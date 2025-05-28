import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://unpkg.com/scrollama?module';

// Initialize scrollama
const scroller = scrollama();
let chartInitialized = false; // Flag to ensure chart initializes only once

// Function to handle step enter
function handleStepEnter(response) {
    // response.element: the DOM element that triggered the event
    // response.index: the index of the step
    // response.direction: 'up' or 'down'
    response.element.style.opacity = 1;
    response.element.style.transform = 'translateY(0)';

    // Check if this is the module for the efficiency chart and if it's not initialized yet
    if (response.element.id === 'efficiency' && !chartInitialized) {
        initSleepChart();
        chartInitialized = true;
    }
}

// Function to handle step exit
function handleStepExit(response) {
    response.element.style.opacity = 0.2;
    response.element.style.transform = 'translateY(50px)';

    // Check if this is the module for the efficiency chart
    if (response.element.id === 'efficiency') {
        const chartContainer = d3.select('#efficiency-chart');
        const svg = chartContainer.select('svg');

        if (!svg.empty()) {
            svg.transition()
                .duration(500) // Duration of the fade-out
                .style('opacity', 0)
                .end() // Get a promise that resolves when the transition ends
                .then(() => {
                    chartContainer.selectAll('*').remove(); // Clear the chart content after fade-out
                    chartInitialized = false; // Reset the flag so chart can be initialized again
                    console.log("Chart faded out and cleared.");
                })
                .catch(error => {
                    // This catch is important if the transition is interrupted (e.g., user scrolls back quickly)
                    // In that case, we might still want to ensure it's cleared and reset if it didn't complete.
                    if (!chartContainer.select('svg').empty()) { // Check if SVG still exists
                         chartContainer.selectAll('*').remove();
                    }
                    chartInitialized = false;
                    console.log("Chart fade-out interrupted or failed, cleared forcefully.", error);
                });
        } else {
            // If SVG is already gone for some reason, just ensure the flag is reset.
            chartInitialized = false;
        }
    }
}

// Setup scrollama
scroller
    .setup({
        step: '.module', // Specify the class of your scrollable elements
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

    console.log('First few sleep data entries:', data.slice(0, 3));
    return data;
}

// Call loadSleepData and then render the chart
async function initSleepChart() {
    const sleep_data = await loadSleepData();
    renderSleepEfficiencyChart(sleep_data);
}

// render sleep efficiency chart
function renderSleepEfficiencyChart(sleep_data) { // Accept sleep_data as a parameter

    //group by user_id and calculate the average efficiency
    const sleep_data_by_user = sleep_data.reduce((acc, curr) => {
        acc[curr.user_id] = acc[curr.user_id] || [];
        acc[curr.user_id].push(curr);
        return acc;
    }, {});

    //calculate the average efficiency for each user
    const sleep_data_by_user_avg = Object.keys(sleep_data_by_user).map(user_id => {
        const user_data = sleep_data_by_user[user_id];
        const avg_efficiency = user_data.reduce((acc, curr) => acc + curr.efficiency, 0) / user_data.length;
        return { user_id: Number(user_id), avg_efficiency }; // Ensure user_id is a number
    });

    const tooltip = d3.select("#tooltip");
    d3.select('#efficiency-chart').selectAll('*').remove();

    const svg = d3.select('#efficiency-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .style('overflow', 'visible')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('opacity', 0); // Start with opacity 0 for fade-in

    // Apply fade-in transition
    svg.transition()
        .duration(500) // Duration of the fade-in in milliseconds
        .style('opacity', 1);

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", usableArea.left)
        .attr("y", usableArea.top)
        .attr("width", usableArea.width)
        .attr("height", usableArea.height);

    // Create a group for the dots that will be clipped
    // This MUST be defined before it's used by the zoomed function or for appending dots
    const dotsGroup = svg.append('g')
        .attr('clip-path', 'url(#clip)');

    const axisPadding = 15; // Padding for the x-axis range, at least dot radius

    const xScale = d3.scaleLinear()
        .domain(d3.extent(sleep_data_by_user_avg, (d) => d.user_id))
        .range([usableArea.left + axisPadding, usableArea.right - axisPadding]) // Added padding to range
        .nice();

    const yScale = d3.scaleLinear()
        .domain([60, 100])
        .range([usableArea.bottom, usableArea.top])
        .nice();

    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on('zoom', zoomed);

    svg.call(zoom);

    function zoomed(event) {
        const newX = event.transform.rescaleX(xScale);
        const newY = event.transform.rescaleY(yScale);

        svg.select('.x-axis').call(d3.axisBottom(newX));
        svg.select('.y-axis').call(d3.axisLeft(newY));

        // Select the dotsGroup (which has the clip-path) and then the circles within it
        svg.select('g[clip-path="url(#clip)"]').selectAll('circle.dots')
            .attr('cx', d => newX(d.user_id))
            .attr('cy', d => newY(d.avg_efficiency));
        
        tooltip.style("opacity", 0);
    }

    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .lower();

    gridlines.call(d3.axisLeft(yScale).tickSize(-usableArea.width).tickFormat(''));
    svg.selectAll(".gridlines .tick line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-opacity", 0.7);
    // gridlines.select(".domain").remove(); // Optional: if y-axis line appears too thick

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", usableArea.bottom + margin.bottom - 5)
        .text("User ID");

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${usableArea.left - margin.left + 20}, ${usableArea.top + usableArea.height / 2}) rotate(-90)`)
        .text("Average Sleep Efficiency (%)");

    dotsGroup.selectAll('circle.dots')
        .data(sleep_data_by_user_avg)
        .join('circle')
        .attr('class', 'dots')
        .attr('cx', d => xScale(d.user_id))
        .attr('cy', d => yScale(d.avg_efficiency))
        .attr('r', 10)
        .attr('fill', 'blue')
        .attr('opacity', 0.5)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 15);
            tooltip.transition().duration(200).style("opacity", .9);

            const userDataEntries = sleep_data_by_user[d.user_id];
            if (!userDataEntries || userDataEntries.length === 0) return;
            const firstEntry = userDataEntries[0];

            const tooltipContent = `User ID: ${d.user_id}\n` +
                                 `Age: ${firstEntry.age}\n` +
                                 `Gender: ${firstEntry.gender}\n` +
                                 `Avg. Efficiency: ${d.avg_efficiency.toFixed(1)}%\n` +
                                 `Sleep Fragmentation Index: ${firstEntry.sleepFragmentationIndex.toFixed(1)}\n` +
                                 `# Awakenings: ${firstEntry.numberOfAwakenings}\n` +
                                 `WASO (min): ${firstEntry.wakeAfterSleepOnset.toFixed(1)}\n` +
                                 `TST (min): ${firstEntry.totalSleepTime.toFixed(1)}`;

            tooltip.html(tooltipContent)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on('mouseout', function(event, d) {
            d3.select(this).attr('r', 10);
            tooltip.transition().duration(500).style("opacity", 0);
        });
}

// Shriya's code for Activity Visualization
const margin = { top: 40, right: 100, bottom: 60, left: 60 };

// Small multiples grid settings
const smallWidth = 180;
const smallHeight = 120;
const gridCols = 6;
const gridPadding = 20;

async function loadAllUsersData() {
    const users = Array.from({length: 22}, (_, i) => i + 1);
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
            userId: userId
        };
    });
    return data;
}

function processData(data) {
    const activityByTime = new Array(24).fill(null)
        .map(() => new Array(60).fill(0));
    
    data.forEach(d => {
        const [hours, minutes] = d.time.split(':').map(Number);
        activityByTime[hours][minutes] += d.steps;
    });

    return activityByTime;
}

function createHeatmap(svg, data, width, height, isSmall = false) {
    const activityByTime = processData(data);
    const maxSteps = Math.max(...activityByTime.map(row => Math.max(...row)));

    const cellHeight = height / 24;
    const cellWidth = width / 60;

    const colorScale = d3.scaleSequential()
        .domain([0, maxSteps])
        .interpolator(d3.interpolateGreens);

    const xScale = d3.scaleLinear()
        .domain([0, 60])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([0, height]);

    // Create heatmap cells
    svg.selectAll('rect')
        .data(activityByTime.flatMap((row, hour) => 
            row.map((steps, minute) => ({hour, minute, steps}))
        ))
        .join('rect')
        .attr('x', d => xScale(d.minute))
        .attr('y', d => yScale(d.hour))
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', d => colorScale(d.steps));

    if (!isSmall) {
        // Add axes for main view
        const xAxis = d3.axisBottom(xScale)
            .ticks(12)
            .tickFormat(d => d + 'm');

        const yAxis = d3.axisLeft(yScale)
            .ticks(24)
            .tickFormat(d => d + 'h');

        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);

        svg.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Add axis labels
        svg.append('text')
            .attr('class', 'x-label')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height + 40)
            .text('Minute');

        svg.append('text')
            .attr('class', 'y-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -height / 2)
            .text('Hour');

        // Add color legend
        const legendWidth = 20;
        const legendHeight = height / 2;
        
        const legendScale = d3.scaleLinear()
            .domain([0, maxSteps])
            .range([legendHeight, 0]);

        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 40}, ${height/4})`);

        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0)
            .attr('y1', legendHeight)
            .attr('x2', 0)
            .attr('y2', 0);

        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const offset = i / numStops;
            const steps = maxSteps * offset;
            gradient.append('stop')
                .attr('offset', `${offset * 100}%`)
                .attr('stop-color', colorScale(steps));
        }

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');

        const legendAxis = d3.axisRight(legendScale)
            .ticks(5);

        legend.append('g')
            .attr('transform', `translate(${legendWidth},0)`)
            .call(legendAxis);

        legend.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -legendHeight/2)
            .attr('y', -18)
            .style('text-anchor', 'middle')
            .text('Steps');
    }

    return { maxSteps, colorScale };
}

async function initVisualization() {
    const allData = await loadAllUsersData();
    
    // Create container for small multiples
    const container = d3.select('#activity-chart')
        .style('position', 'relative');

    // Add title
    container.append('h2')
        .style('text-align', 'center')
        .style('margin-bottom', '20px');

    // Create grid for small multiples
    const grid = container.append('div')
        .attr('class', 'small-multiples-grid')
        .style('display', 'grid')
        .style('grid-template-columns', `repeat(${gridCols}, 1fr)`)
        .style('gap', `${gridPadding}px`)
        .style('padding', '20px');

    // Create small multiples
    allData.forEach((userData, i) => {
        const userId = i + 1;
        const cell = grid.append('div')
            .attr('class', 'grid-cell')
            .style('cursor', 'pointer')
            .on('click', () => showDetailView(userId));

        cell.append('h4')
            .style('margin', '0 0 5px 0')
            .style('text-align', 'center')
            .text(`User ${userId}`);

        const svg = cell.append('svg')
            .attr('width', smallWidth)
            .attr('height', smallHeight)
            .append('g')
            .attr('transform', `translate(5,5)`);

        createHeatmap(svg, userData, smallWidth - 10, smallHeight - 10, true);
    });

    // Create detail view container (hidden initially)
    const detailContainer = container.append('div')
        .attr('class', 'detail-view')
        .style('display', 'none')
        .style('position', 'fixed')
        .style('top', '0')
        .style('left', '0')
        .style('width', '100%')
        .style('height', '100%')
        .style('background', 'rgba(255,255,255,0.95)')
        .style('padding', '20px');

    function showDetailView(userId) {
        const userData = allData[userId - 1];
        
        detailContainer.style('display', 'block')
            .html('');

        // Add header with controls
        const header = detailContainer.append('div')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('align-items', 'center')
            .style('margin-bottom', '20px');

        header.append('h2')
            .text(`User ${userId} Activity Pattern`);

        const controls = header.append('div')
            .style('display', 'flex')
            .style('gap', '20px')
            .style('align-items', 'center');

        // Add view mode selector
        let currentViewMode = 'hour';
        
        const viewSelector = controls.append('div')
            .style('display', 'flex')
            .style('align-items', 'center');

        viewSelector.append('label')
            .attr('for', 'view-mode')
            .style('margin-right', '10px')
            .style('font-weight', 'bold')
            .text('View Mode:');

        viewSelector.append('select')
            .attr('id', 'view-mode')
            .style('padding', '5px')
            .style('border-radius', '4px')
            .style('border', '1px solid #ddd')
            .on('change', function() {
                currentViewMode = this.value;
                hourHighlights.style('pointer-events', currentViewMode === 'hour' ? 'all' : 'none');
                minuteHighlights.style('pointer-events', currentViewMode === 'minute' ? 'all' : 'none');
                summaryPanel.style('opacity', 0);
            })
            .selectAll('option')
            .data([
                {value: 'hour', text: 'Hour View'},
                {value: 'minute', text: 'Minute View'}
            ])
            .join('option')
            .attr('value', d => d.value)
            .text(d => d.text);

        // Add close button
        controls.append('button')
            .text('Close')
            .style('margin-left', '10px')
            .on('click', () => {
                detailContainer.style('display', 'none');
            });

        // Create summary panel
        const summaryPanel = detailContainer.append('div')
            .attr('class', 'summary-panel')
            .style('position', 'absolute')
            .style('right', '20px')
            .style('top', '100px')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '8px')
            .style('padding', '15px')
            .style('width', '250px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
            .style('opacity', 0)
            .style('transition', 'opacity 0.2s ease-in-out');

        // Create main visualization
        const svg = detailContainer.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const activityByTime = processData(userData);
        createHeatmap(svg, userData, width, height, false);

        // Add hour highlights
        const hourHighlights = svg.append('g')
            .attr('class', 'hour-highlights')
            .selectAll('rect')
            .data(Array.from({length: 24}, (_, i) => i))
            .join('rect')
            .attr('x', 0)
            .attr('y', hour => (hour * height) / 24)
            .attr('width', width)
            .attr('height', height / 24)
            .attr('fill', 'transparent')
            .attr('pointer-events', 'all')
            .on('mouseover', function(event, hour) {
                if (currentViewMode === 'hour') {
                    d3.select(this).attr('fill', 'rgba(0,0,0,0.1)');
                    updateSummaryPanel(activityByTime, hour, 'hour', summaryPanel);
                }
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', 'transparent');
                summaryPanel.style('opacity', 0);
            });

        // Add minute highlights
        const minuteHighlights = svg.append('g')
            .attr('class', 'minute-highlights')
            .selectAll('rect')
            .data(Array.from({length: 60}, (_, i) => i))
            .join('rect')
            .attr('x', minute => (minute * width) / 60)
            .attr('y', 0)
            .attr('width', width / 60)
            .attr('height', height)
            .attr('fill', 'transparent')
            .attr('pointer-events', 'none')
            .on('mouseover', function(event, minute) {
                if (currentViewMode === 'minute') {
                    d3.select(this).attr('fill', 'rgba(0,0,0,0.1)');
                    updateSummaryPanel(activityByTime, minute, 'minute', summaryPanel);
                }
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', 'transparent');
                summaryPanel.style('opacity', 0);
            });
    }

    function updateSummaryPanel(activityData, value, type, panel) {
        const stats = type === 'hour' ? 
            calculateHourStats(activityData, value) : 
            calculateMinuteStats(activityData, value);

        panel.style('opacity', 1)
            .html('');

        panel.append('h3')
            .style('margin', '0 0 10px 0')
            .style('color', '#333')
            .text(type === 'hour' ? `Hour ${value} Summary` : `Minute ${value} Summary`);

        if (type === 'hour') {
            panel.append('div')
                .html(`<strong>Total Steps:</strong> ${stats.totalSteps}`);
            panel.append('div')
                .html(`<strong>Most Active Minute:</strong> :${stats.mostActiveMinute.toString().padStart(2, '0')}`);
            panel.append('div')
                .html(`<strong>Active Minutes:</strong> ${stats.activePercentage.toFixed(1)}%`);
        } else {
            panel.append('div')
                .html(`<strong>Total Steps:</strong> ${stats.totalSteps}`);
            panel.append('div')
                .html(`<strong>Most Active Hour:</strong> ${stats.mostActiveHour}:00`);
            panel.append('div')
                .html(`<strong>Active Hours:</strong> ${stats.activePercentage.toFixed(1)}%`);
        }
    }

    function calculateHourStats(activityData, hour) {
        const hourData = activityData[hour];
        const totalSteps = hourData.reduce((sum, steps) => sum + steps, 0);
        const mostActiveMinute = hourData.reduce((max, steps, minute) => 
            steps > hourData[max] ? minute : max, 0);
        const activeMinutes = hourData.filter(steps => steps > 0).length;
        const activePercentage = (activeMinutes / 60) * 100;

        return {
            totalSteps,
            mostActiveMinute,
            activePercentage
        };
    }

    function calculateMinuteStats(activityData, minute) {
        const minuteData = activityData.map(hour => hour[minute]);
        const totalSteps = minuteData.reduce((sum, steps) => sum + steps, 0);
        const mostActiveHour = minuteData.reduce((max, steps, hour) => 
            steps > minuteData[max] ? hour : max, 0);
        const activeHours = minuteData.filter(steps => steps > 0).length;
        const activePercentage = (activeHours / 24) * 100;

        return {
            totalSteps,
            mostActiveHour,
            activePercentage
        };
    }
}

// Initialize the visualization
initVisualization();