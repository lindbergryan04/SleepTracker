import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://unpkg.com/scrollama?module';

// Initialize scrollama
const scroller = scrollama();

// Function to handle step enter
function handleStepEnter(response) {
    // response.element: the DOM element that triggered the event
    // response.index: the index of the step
    // response.direction: 'up' or 'down'
    response.element.style.opacity = 1;
    response.element.style.transform = 'translateY(0)';
}

// Function to handle step exit
function handleStepExit(response) {
    response.element.style.opacity = 0.2;
    response.element.style.transform = 'translateY(50px)';
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
    }).sort((a, b) => a.avg_efficiency - b.avg_efficiency); // Sort by average efficiency in ascending order

    const dataForPlot = sleep_data_by_user_avg.map((d, i) => ({ ...d, plot_x_index: i }));

    const tooltip = d3.select("#tooltip");
    d3.select('#efficiency-chart').selectAll('*').remove();

    const svg = d3.select('#efficiency-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .style('overflow', 'visible')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('opacity', 1); // MODIFIED: Start with opacity 1, remove transition

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

    const axisPadding = 15; // Padding for the x-axis range

    const xScale = d3.scaleLinear()
        .domain([0, Math.max(0, dataForPlot.length - 1)]) // Domain is 0 to N-1 based on sorted index
        .range([usableArea.left + axisPadding, usableArea.right - axisPadding]);

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

        svg.select('.y-axis').call(d3.axisLeft(newY));

        // Select the dotsGroup and then the circles within it
        svg.select('g[clip-path="url(#clip)"]').selectAll('circle.dots')
            .attr('cx', d => newX(d.plot_x_index)) // d here has plot_x_index from dataForPlot
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

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${usableArea.left - margin.left + 20}, ${usableArea.top + usableArea.height / 2}) rotate(-90)`)
        .text("Average Sleep Efficiency by User")
        .style("font-size", "13px")
        .style("font-weight", "500");

    dotsGroup.selectAll('circle.dots')
        .data(dataForPlot) // Use dataForPlot which includes plot_x_index
        .join('circle')
        .attr('class', 'dots')
        .attr('cx', d => xScale(d.plot_x_index)) // Use plot_x_index for cx
        .attr('cy', d => yScale(d.avg_efficiency))
        .attr('r', 8) // Slightly smaller default radius
        .attr('fill', '#28a745') // New dot color (green)
        .attr('stroke', '#1e7e34') // Dot stroke color
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.7) // Default opacity
        .attr('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            d3.select(this)
                .attr('r', 12) // Larger radius on hover
                .attr('fill', '#28a745') // Keep fill color or make it slightly lighter/darker
                .attr('stroke', '#155724') // Darker stroke on hover
                .attr('stroke-width', 2)
                .attr('opacity', 1); // Full opacity on hover

            const userDataEntries = sleep_data_by_user[d.user_id];
            const firstEntry = userDataEntries ? userDataEntries[0] : undefined;

            if (!firstEntry) {
                tooltip.style("opacity", 0); // Explicitly hide tooltip if data is missing
                return; // Exit if no valid data for the tooltip
            }

            const tooltipContent = `User ID: ${d.user_id}<br/>` +
                `Age: ${firstEntry.age}<br/>` +
                `Gender: ${firstEntry.gender}<br/>` +
                `Avg. Efficiency: ${d.avg_efficiency.toFixed(1)}%<br/>` +
                `Sleep Fragmentation Index: ${firstEntry.sleepFragmentationIndex.toFixed(1)}<br/>` +
                `# Awakenings: ${firstEntry.numberOfAwakenings}<br/>` +
                `WASO (min): ${firstEntry.wakeAfterSleepOnset.toFixed(1)}<br/>` +
                `TST (min): ${firstEntry.totalSleepTime.toFixed(1)}`;

            tooltip.html(tooltipContent)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px")
                .transition().duration(200).style("opacity", .9); // Show tooltip after setting content and position
        })
        .on('mouseout', function (event, d) {
            d3.select(this)
                .attr('r', 8) // Revert radius
                .attr('fill', '#28a745') // Revert fill color (though it wasn't changed on hover in current setup)
                .attr('stroke', '#1e7e34') // Revert stroke color
                .attr('stroke-width', 1.5) // Revert stroke-width
                .attr('opacity', 0.7); // Revert opacity
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Add X-axis title
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", height - 15) // Adjusted Y to be clearly within SVG bounds
        .text("Users (Sorted by Average Sleep Efficiency)")
        .style("font-size", "13px")
        .style("font-weight", "500");
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
        const m = (n * sumXY - sumX * sumY) / denominator;
        const c = (sumY - m * sumX) / n;

        return { m, c, predict: function (x_input) { return this.m * x_input + this.c; } };
    }

    // Load hormone data directly within this function
    const hormone_data_entries = await loadHormoneData();

    // 2. Process sleep_data_raw to get average efficiency per user
    const sleep_data_by_user = sleep_data_raw.reduce((acc, curr) => {
        if (curr.user_id === undefined || curr.efficiency === undefined) return acc; // Skip if essential data missing
        acc[curr.user_id] = acc[curr.user_id] || [];
        acc[curr.user_id].push(curr);
        return acc;
    }, {});

    const sleep_efficiency_avg = Object.keys(sleep_data_by_user).map(user_id_str => {
        const user_id = Number(user_id_str);
        const user_data = sleep_data_by_user[user_id];
        if (!user_data || user_data.length === 0) return null;

        const valid_efficiencies = user_data.map(d => d.efficiency).filter(e => typeof e === 'number' && !isNaN(e));
        if (valid_efficiencies.length === 0) return null;

        const total_efficiency = valid_efficiencies.reduce((acc, curr) => acc + curr, 0);
        const avg_efficiency = total_efficiency / valid_efficiencies.length;
        return { user_id: user_id, avg_efficiency };
    }).filter(item => item !== null && !isNaN(item.avg_efficiency));


    // 3. Merge hormone data with average sleep efficiency
    const merged_data = hormone_data_entries.map(h_entry => {
        const efficiency_entry = sleep_efficiency_avg.find(s_entry => s_entry.user_id === h_entry.user_id);
        return {
            ...h_entry,
            avg_efficiency: efficiency_entry ? efficiency_entry.avg_efficiency : null
        };
    }).filter(d => d.avg_efficiency !== null && d.avg_efficiency > 0 && typeof d.melatonin === 'number' && !isNaN(d.melatonin) && typeof d.cortisol === 'number' && !isNaN(d.cortisol));

    // 4. Sort by average sleep efficiency (least to greatest)
    merged_data.sort((a, b) => a.avg_efficiency - b.avg_efficiency);

    // ADDED: Filter out user 12 for regression calculation
    const data_for_regression = merged_data.filter(d => d.user_id !== 12);

    // 5. Setup SVG and chart dimensions
    chartContainer.selectAll('*').remove(); // Clear previous chart just in case

    const globalWidth = width; // Using the global width variable from your script
    const margin = { top: 50, right: 40, bottom: 100, left: 70 }; // Adjusted margins
    const chartHeight = 220;
    const gapBetweenCharts = 40;

    const usableWidth = globalWidth - margin.left - margin.right;
    const totalSvgHeight = (chartHeight * 2) + gapBetweenCharts + margin.top + margin.bottom;

    const svgRoot = chartContainer
        .append('svg')
        .attr('width', globalWidth)
        .attr('height', totalSvgHeight)
        .style('opacity', 1); 

    const svg = svgRoot.append('g') // The group for margins and chart content
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // 6. X-scale (shared for both charts)
    const xScale = d3.scaleBand()
        .domain(merged_data.map(d => d.user_id.toString()))
        .range([0, usableWidth])
        .padding(0.25);

    // Tooltip (defined once, used by both charts)
    // Remove any existing tooltip to avoid duplicates if this function is called multiple times
    d3.select(".hormone-tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "hormone-tooltip") // Class for CSS styling
        .style("opacity", 0); // Start hidden, controlled by JS

    const lineGenerator = d3.line()
        .x(d => d.x_pixel)
        .y(d => d.y_pixel);

    function showTooltip(event, d, type) {
        tooltip.transition().duration(200).style("opacity", .9);
        const value = type === 'melatonin' ? d.melatonin : d.cortisol;
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        
        const formattedValue = type === 'melatonin' ? d3.format(".2e")(value) : value.toFixed(2);

        tooltip.html(
            `<b>User ID:</b> ${d.user_id}<br/>` +
            `<b>Avg. Efficiency:</b> ${d.avg_efficiency.toFixed(1)}%<br/>` +
            `<b>${typeName}:</b> ${formattedValue}` // Use formattedValue here
        )
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    }

    function hideTooltip() {
        tooltip.transition().duration(300).style("opacity", 0);
    }

    // Chart Title (Overall)
    svg.append("text")
        .attr("x", usableWidth / 2)
        .attr("y", 0 - (margin.top / 2) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Hormone Levels vs. Sleep Efficiency");

    // === Melatonin Chart (Top) ===
    const melatoninG = svg.append('g').attr('class', 'melatonin-chart');

    const yMelatoninMax = d3.max(merged_data, d => d.melatonin);
    const yMelatoninScale = d3.scaleLinear()
        .domain([0, yMelatoninMax > 0 ? yMelatoninMax : 1])
        .nice()
        .range([chartHeight, 0]);

    // Add Y-axis gridlines for Melatonin
    melatoninG.append('g')
        .attr('class', 'grid melatonin-grid')
        .call(d3.axisLeft(yMelatoninScale)
            .ticks(5)
            .tickSize(-usableWidth)
            .tickFormat('')
        )
        .selectAll(".tick line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-opacity", 0.7);
    melatoninG.select(".melatonin-grid .domain").remove(); // Remove the vertical line of the grid axis

    melatoninG.append('g')
        .attr('class', 'y-axis melatonin-y-axis')
        .call(d3.axisLeft(yMelatoninScale).ticks(5).tickFormat(d3.format(".2e")));

    melatoninG.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (chartHeight / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .text("Normalized Melatonin");

    melatoninG.selectAll('.bar-melatonin')
        .data(merged_data)
        .join('rect')
        .attr('class', 'bar-melatonin')
        .attr('x', d => xScale(d.user_id.toString()))
        .attr('y', d => yMelatoninScale(d.melatonin))
        .attr('width', xScale.bandwidth())
        .attr('height', d => chartHeight - yMelatoninScale(d.melatonin))
        .attr('fill', '#4A90E2') // New melatonin color
        .attr('rx', 4) // Rounded corners
        .attr('ry', 4) // Rounded corners
        .on('mouseover', function(event, d) {
            d3.select(this).attr('fill', '#7BB6F7'); // Lighter on hover
            showTooltip(event, d, 'melatonin');
        })
        .on('mouseout', function() {
            d3.select(this).attr('fill', '#4A90E2'); // Revert to original color
            hideTooltip();
        });

    // ADDED: Melatonin Regression Line (calculated on data_for_regression)
    const melatonin_regression = calculateLinearRegression(
        data_for_regression,
        d => d.avg_efficiency,
        d => d.melatonin
    );

    if (melatonin_regression && data_for_regression.length >= 2) {
        const first_user_reg = data_for_regression[0];
        const last_user_reg = data_for_regression[data_for_regression.length - 1];

        const line_points_melatonin = [
            {
                x_pixel: xScale(first_user_reg.user_id.toString()) + xScale.bandwidth() / 2,
                y_pixel: yMelatoninScale(melatonin_regression.predict(first_user_reg.avg_efficiency))
            },
            {
                x_pixel: xScale(last_user_reg.user_id.toString()) + xScale.bandwidth() / 2,
                y_pixel: yMelatoninScale(melatonin_regression.predict(last_user_reg.avg_efficiency))
            }
        ].filter(p => !isNaN(p.x_pixel) && !isNaN(p.y_pixel) && isFinite(p.y_pixel));


        if (line_points_melatonin.length >= 2) { // Need at least 2 points to draw a line
            melatoninG.append("path")
                .datum(line_points_melatonin)
                .attr("class", "regression-line melatonin-regression")
                .attr("fill", "none")
                .attr("stroke", "#0056b3") // New melatonin regression color
                .attr("stroke-width", 2.5) // Slightly thicker
                .attr("stroke-dasharray", "5,5")
                .attr("d", lineGenerator);
        }
    }


    // === Cortisol Chart (Bottom, Inverted) ===
    const cortisolG = svg.append('g')
        .attr('class', 'cortisol-chart')
        .attr('transform', `translate(0, ${chartHeight + gapBetweenCharts})`);

    const yCortisolMax = d3.max(merged_data, d => d.cortisol);
    const yCortisolScale = d3.scaleLinear()
        .domain([0, yCortisolMax > 0 ? yCortisolMax : 1])
        .nice()
        .range([0, chartHeight]); // Inverted range for upside down bars

    // Add Y-axis gridlines for Cortisol
    cortisolG.append('g')
        .attr('class', 'grid cortisol-grid')
        .call(d3.axisLeft(yCortisolScale)
            .ticks(5)
            .tickSize(-usableWidth)
            .tickFormat('')
        )
        .selectAll(".tick line")
        .attr("stroke", "#e0e0e0")
        .attr("stroke-opacity", 0.7);
    cortisolG.select(".cortisol-grid .domain").remove(); // Remove the vertical line of the grid axis

    cortisolG.append('g')
        .attr('class', 'y-axis cortisol-y-axis')
        .call(d3.axisLeft(yCortisolScale).ticks(5).tickFormat(d3.format(".2f")));

    cortisolG.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (chartHeight / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "500")
        .text("Normalized Cortisol");

    cortisolG.selectAll('.bar-cortisol')
        .data(merged_data)
        .join('rect')
        .attr('class', 'bar-cortisol')
        .attr('x', d => xScale(d.user_id.toString()))
        .attr('y', 0)
        .attr('width', xScale.bandwidth())
        .attr('height', d => yCortisolScale(d.cortisol))
        .attr('fill', '#F5A623') // New cortisol color
        .attr('rx', 4) // Rounded corners
        .attr('ry', 4) // Rounded corners
        .on('mouseover', function(event, d) {
            d3.select(this).attr('fill', '#FBCB7A'); // Lighter on hover
            showTooltip(event, d, 'cortisol');
        })
        .on('mouseout', function() {
            d3.select(this).attr('fill', '#F5A623'); // Revert to original color
            hideTooltip();
        });

    // ADDED: Cortisol Regression Line (calculated on data_for_regression)
    const cortisol_regression = calculateLinearRegression(
        data_for_regression,
        d => d.avg_efficiency,
        d => d.cortisol
    );

    if (cortisol_regression && data_for_regression.length >= 2) {
        const first_user_reg_cort = data_for_regression[0];
        const last_user_reg_cort = data_for_regression[data_for_regression.length - 1];
        
        const line_points_cortisol = [
            {
                x_pixel: xScale(first_user_reg_cort.user_id.toString()) + xScale.bandwidth() / 2,
                y_pixel: yCortisolScale(cortisol_regression.predict(first_user_reg_cort.avg_efficiency))
            },
            {
                x_pixel: xScale(last_user_reg_cort.user_id.toString()) + xScale.bandwidth() / 2,
                y_pixel: yCortisolScale(cortisol_regression.predict(last_user_reg_cort.avg_efficiency))
            }
        ].filter(p => !isNaN(p.x_pixel) && !isNaN(p.y_pixel) && isFinite(p.y_pixel));

        if (line_points_cortisol.length >= 2) { // Need at least 2 points to draw a line
            cortisolG.append("path")
                .datum(line_points_cortisol)
                .attr("class", "regression-line cortisol-regression")
                .attr("fill", "none")
                .attr("stroke", "#C77700") // New cortisol regression color
                .attr("stroke-width", 2.5) // Slightly thicker
                .attr("stroke-dasharray", "5,5")
                .attr("d", lineGenerator);
        }
    }

    // === Shared X-axis (at the very bottom) ===
    const xAxisG = svg.append('g')
        .attr('class', 'x-axis shared-x-axis')
        .attr('transform', `translate(0, ${chartHeight * 2 + gapBetweenCharts})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-60)");

    svg.append("text")
        .attr("class", "x-axis-label shared-x-axis-label")
        .attr("x", usableWidth / 2)
        .attr("y", (chartHeight * 2 + gapBetweenCharts) + 50) 
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("font-weight", "500")
        .text("Users (Sorted by Sleep Efficiency: Low to High)");
}

async function initHormoneChart() {
    const chartContainerId = '#hormone-chart';
    const sleep_data_for_hormones = await loadSleepData();

    await renderHoromoneChart(sleep_data_for_hormones);
}

// Shriya's code for Activity Visualization
const margin = { top: 40, right: 100, bottom: 60, left: 60 };

// Small multiples grid settings
const smallWidth = 180;
const smallHeight = 120;
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

function createHeatmap(svg, data, width, height, isSmall = false) {
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

    // Create heatmap cells
    svg.selectAll('rect')
        .data(activityByTime.flatMap((row, hour) =>
            row.map((cell, minute) => ({
                hour,
                minute,
                steps: cell.steps,
                hr: cell.hr
            }))
        ))
        .join('rect')
        .attr('x', d => xScale(d.minute))
        .attr('y', d => yScale(d.hour))
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', d => hrColorScale(d.hr))
        .attr('opacity', d => opacityScale(d.steps));

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

        // Add bivariate legend
        const legendWidth = 200;
        const legendHeight = height / 2;
        const legendMargin = { top: 20, right: 20, bottom: 30, left: 40 };

        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 40}, ${height / 4})`);

        // Add title
        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('text-anchor', 'start')
            .style('font-weight', 'bold')
            .text('Activity Zones');

        // Create heart rate zones legend
        const zoneHeight = 30;
        hrZones.forEach((zone, i) => {
            const zoneGroup = legend.append('g')
                .attr('transform', `translate(0, ${i * (zoneHeight + 5)})`);

            zoneGroup.append('rect')
                .attr('width', 20)
                .attr('height', zoneHeight)
                .attr('fill', zone.color);

            zoneGroup.append('text')
                .attr('x', 25)
                .attr('y', zoneHeight / 2)
                .attr('dominant-baseline', 'middle')
                .text(`${zone.label} (${zone.min}-${zone.max} bpm)`);
        });

        // Create steps opacity legend
        const stepsLegend = legend.append('g')
            .attr('transform', `translate(0, ${(hrZones.length + 1) * (zoneHeight + 5)})`);

        stepsLegend.append('text')
            .attr('x', 0)
            .attr('y', -5)
            .text('Steps Intensity');

        const opacityGradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'opacity-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        opacityGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#000')
            .attr('stop-opacity', opacityScale(0));

        opacityGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#000')
            .attr('stop-opacity', opacityScale(maxSteps));

        stepsLegend.append('rect')
            .attr('width', 100)
            .attr('height', 20)
            .style('fill', 'url(#opacity-gradient)');

        const stepsScale = d3.scaleLinear()
            .domain([0, maxSteps])
            .range([0, 100]);

        const stepsAxis = d3.axisBottom(stepsScale)
            .ticks(5);

        stepsLegend.append('g')
            .attr('transform', 'translate(0,20)')
            .call(stepsAxis);
    }

    return { maxSteps };
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
        .style('padding', '20px')
        .style('position', 'relative');  // Add relative positioning

    // Create small multiples
    const sortedData = allData.map((userData, index) => ({
        userId: index + 1,
        data: userData,
        totalSteps: userData.reduce((sum, d) => sum + d.steps, 0)
    }))
        .sort((a, b) => a.totalSteps - b.totalSteps);  // Sort by total steps ascending

    sortedData.forEach(({ userId, data: userData, totalSteps }) => {
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

        // Display total steps
        cell.append('div')
            .style('text-align', 'center')
            .style('font-size', '0.9em')
            .style('color', '#666')
            .style('margin-top', '5px')
            .html(`Total Steps: <strong>${totalSteps.toLocaleString()}</strong>`);
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
            .on('change', function () {
                currentViewMode = this.value;
                hourHighlights.style('pointer-events', currentViewMode === 'hour' ? 'all' : 'none');
                minuteHighlights.style('pointer-events', currentViewMode === 'minute' ? 'all' : 'none');
                summaryPanel.style('opacity', 0);
            })
            .selectAll('option')
            .data([
                { value: 'hour', text: 'Hour View' },
                { value: 'minute', text: 'Minute View' }
            ])
            .join('option')
            .attr('value', d => d.value)
            .text(d => d.text);

        // Add close button
        controls.append('button')
            .text('Close')
            .style('margin-left', '10px')
            .style('padding', '5px 10px')
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
            .data(Array.from({ length: 24 }, (_, i) => i))
            .join('rect')
            .attr('x', 0)
            .attr('y', hour => (hour * height) / 24)
            .attr('width', width)
            .attr('height', height / 24)
            .attr('fill', 'transparent')
            .attr('pointer-events', 'all')
            .on('mouseover', function (event, hour) {
                if (currentViewMode === 'hour') {
                    d3.select(this).attr('fill', 'rgba(0,0,0,0.1)');
                    updateSummaryPanel(activityByTime, hour, 'hour', summaryPanel);
                }
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', 'transparent');
                summaryPanel.style('opacity', 0);
            });

        // Add minute highlights
        const minuteHighlights = svg.append('g')
            .attr('class', 'minute-highlights')
            .selectAll('rect')
            .data(Array.from({ length: 60 }, (_, i) => i))
            .join('rect')
            .attr('x', minute => (minute * width) / 60)
            .attr('y', 0)
            .attr('width', width / 60)
            .attr('height', height)
            .attr('fill', 'transparent')
            .attr('pointer-events', 'none')
            .on('mouseover', function (event, minute) {
                if (currentViewMode === 'minute') {
                    d3.select(this).attr('fill', 'rgba(0,0,0,0.1)');
                    updateSummaryPanel(activityByTime, minute, 'minute', summaryPanel);
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

// Initialize the visualization
initVisualization();

// ADDED: Initialize other charts directly on page load
initSleepChart();
initHormoneChart();