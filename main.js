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
        const valid_efficiencies = user_data.map(d => d.efficiency).filter(e => typeof e === 'number' && !isNaN(e));
        const valid_tst = user_data.map(d => d.totalSleepTime).filter(tst => typeof tst === 'number' && !isNaN(tst));
        const valid_waso = user_data.map(d => d.wakeAfterSleepOnset).filter(waso => typeof waso === 'number' && !isNaN(waso));
        const valid_movement_index = user_data.map(d => d.movementIndex).filter(mi => typeof mi === 'number' && !isNaN(mi));
        const valid_frag_index = user_data.map(d => d.sleepFragmentationIndex).filter(sfi => typeof sfi === 'number' && !isNaN(sfi));

        if (valid_efficiencies.length === 0) return null; // Keep this check for the primary metric

        const avg_efficiency = valid_efficiencies.reduce((acc, curr) => acc + curr, 0) / valid_efficiencies.length;
        const avg_tst = valid_tst.length > 0 ? valid_tst.reduce((acc, curr) => acc + curr, 0) / valid_tst.length : null;
        const avg_waso = valid_waso.length > 0 ? valid_waso.reduce((acc, curr) => acc + curr, 0) / valid_waso.length : null;
        const avg_movement_index = valid_movement_index.length > 0 ? valid_movement_index.reduce((acc, curr) => acc + curr, 0) / valid_movement_index.length : null;
        const avg_frag_index = valid_frag_index.length > 0 ? valid_frag_index.reduce((acc, curr) => acc + curr, 0) / valid_frag_index.length : null;

        return { user_id: Number(user_id), avg_efficiency, totalSleepTime: avg_tst, wakeAfterSleepOnset: avg_waso, movementIndex: avg_movement_index, sleepFragmentationIndex: avg_frag_index };
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

    const user_sleep_summary = Object.keys(sleep_data_by_user).map(user_id_str => {
        const user_id = Number(user_id_str);
        const user_data = sleep_data_by_user[user_id];
        if (!user_data || user_data.length === 0) return null;

        const valid_efficiencies = user_data.map(d => d.efficiency).filter(e => typeof e === 'number' && !isNaN(e));
        const valid_tst = user_data.map(d => d.totalSleepTime).filter(tst => typeof tst === 'number' && !isNaN(tst));
        const valid_waso = user_data.map(d => d.wakeAfterSleepOnset).filter(waso => typeof waso === 'number' && !isNaN(waso));
        const valid_movement_index = user_data.map(d => d.movementIndex).filter(mi => typeof mi === 'number' && !isNaN(mi));
        const valid_frag_index = user_data.map(d => d.sleepFragmentationIndex).filter(sfi => typeof sfi === 'number' && !isNaN(sfi));

        if (valid_efficiencies.length === 0) return null; // Keep this check for the primary metric

        const avg_efficiency = valid_efficiencies.reduce((acc, curr) => acc + curr, 0) / valid_efficiencies.length;
        const avg_tst = valid_tst.length > 0 ? valid_tst.reduce((acc, curr) => acc + curr, 0) / valid_tst.length : null;
        const avg_waso = valid_waso.length > 0 ? valid_waso.reduce((acc, curr) => acc + curr, 0) / valid_waso.length : null;
        const avg_movement_index = valid_movement_index.length > 0 ? valid_movement_index.reduce((acc, curr) => acc + curr, 0) / valid_movement_index.length : null;
        const avg_frag_index = valid_frag_index.length > 0 ? valid_frag_index.reduce((acc, curr) => acc + curr, 0) / valid_frag_index.length : null;

        return {
            user_id: user_id,
            avg_efficiency,
            totalSleepTime: avg_tst,
            wakeAfterSleepOnset: avg_waso,
            movementIndex: avg_movement_index,
            sleepFragmentationIndex: avg_frag_index
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
        d.avg_efficiency !== null && d.avg_efficiency > 0 && // Keep primary filter
        typeof d.melatonin === 'number' && !isNaN(d.melatonin) &&
        typeof d.cortisol === 'number' && !isNaN(d.cortisol)
    );

    // Initial currentXAxisMetric
    let currentXAxisMetric = 'avg_efficiency';
    const xAxisMetricSelect = d3.select("#hormone-x-metric");


    // 5. Setup SVG and chart dimensions (These are relatively static, so can stay outside update)
    chartContainer.selectAll('*').remove();

    const globalWidth = width;
    const margin = { top: 50, right: 40, bottom: 100, left: 70 };
    const chartHeight = 220;
    const gapBetweenCharts = 40;

    const usableWidth = globalWidth - margin.left - margin.right;
    const totalSvgHeight = (chartHeight * 2) + gapBetweenCharts + margin.top + margin.bottom;

    const svgRoot = chartContainer
        .append('svg')
        .attr('width', globalWidth)
        .attr('height', totalSvgHeight)
        .style('opacity', 1);

    const svg = svgRoot.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const lineGenerator = d3.line()
        .x(d => d.x_pixel)
        .y(d => d.y_pixel);

    const trendlineCheckbox = d3.select("#hormone-trendline-checkbox");
    const contextToggleCheckbox = d3.select("#hormone-context-toggle"); // New checkbox
    const metricContextDiv = d3.select("#hormone-metric-context"); // The div to toggle

    // Scales will be defined and updated within updateHormoneChart
    let xScale, yMelatoninScale, yCortisolScale;
    let melatonin_regression, cortisol_regression;
    let merged_data, data_for_regression; // These will be reassigned in updateHormoneChart

    // Tooltip setup (once)
    d3.select(".hormone-tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "hormone-tooltip")
        .style("opacity", 0);

    function showTooltip(event, d, type) {
        tooltip.transition().duration(200).style("opacity", .9);
        const value = type === 'melatonin' ? d.melatonin : d.cortisol;
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        const formattedValue = type === 'melatonin' ? d3.format(".2e")(value) : value.toFixed(2);
        const metricLabel = xAxisMetricSelect.node().selectedOptions[0].text;
        const metricValue = d[currentXAxisMetric] !== null ? d[currentXAxisMetric].toFixed(1) : 'N/A';

        tooltip.html(
            `<b>User ID:</b> ${d.user_id}<br/>` +
            `<b>${metricLabel}:</b> ${metricValue}<br/>` + // Dynamic metric
            `<b>${typeName}:</b> ${formattedValue}`
        )
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    function hideTooltip() {
        tooltip.transition().duration(300).style("opacity", 0);
    }

    // Chart Title (Overall - static)
    svg.append("text")
        .attr("x", usableWidth / 2)
        .attr("y", 0 - (margin.top / 2) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        // .text("Hormone Levels vs. Selected Sleep Metric"); // Will be set in updateHormoneChart

    // Create G elements for charts (once)
    const melatoninG = svg.append('g').attr('class', 'melatonin-chart');
    const cortisolG = svg.append('g')
        .attr('class', 'cortisol-chart')
        .attr('transform', `translate(0, ${chartHeight + gapBetweenCharts})`);


    function drawMelatoninRegressionLine() {
        melatoninG.select(".melatonin-regression").remove();
        if (trendlineCheckbox.property("checked") && melatonin_regression && data_for_regression && data_for_regression.length >= 2) {
            const first_user_reg = data_for_regression[0];
            const last_user_reg = data_for_regression[data_for_regression.length - 1];
            const line_points_melatonin = [
                {
                    x_pixel: xScale(first_user_reg.user_id.toString()) + xScale.bandwidth() / 2,
                    y_pixel: yMelatoninScale(melatonin_regression.predict(first_user_reg[currentXAxisMetric]))
                },
                {
                    x_pixel: xScale(last_user_reg.user_id.toString()) + xScale.bandwidth() / 2,
                    y_pixel: yMelatoninScale(melatonin_regression.predict(last_user_reg[currentXAxisMetric]))
                }
            ].filter(p => !isNaN(p.x_pixel) && !isNaN(p.y_pixel) && isFinite(p.y_pixel) && p.y_pixel !== null);
            if (line_points_melatonin.length >= 2) {
                melatoninG.append("path")
                    .datum(line_points_melatonin)
                    .attr("class", "regression-line melatonin-regression")
                    .attr("fill", "none").attr("stroke", "#0056b3").attr("stroke-width", 2.5).attr("stroke-dasharray", "5,5").attr("d", lineGenerator);
            }
        }
    }

    function drawCortisolRegressionLine() {
        cortisolG.select(".cortisol-regression").remove();
        if (trendlineCheckbox.property("checked") && cortisol_regression && data_for_regression && data_for_regression.length >= 2) {
            const first_user_reg_cort = data_for_regression[0];
            const last_user_reg_cort = data_for_regression[data_for_regression.length - 1];
            const line_points_cortisol = [
                {
                    x_pixel: xScale(first_user_reg_cort.user_id.toString()) + xScale.bandwidth() / 2,
                    y_pixel: yCortisolScale(cortisol_regression.predict(first_user_reg_cort[currentXAxisMetric]))
                },
                {
                    x_pixel: xScale(last_user_reg_cort.user_id.toString()) + xScale.bandwidth() / 2,
                    y_pixel: yCortisolScale(cortisol_regression.predict(last_user_reg_cort[currentXAxisMetric]))
                }
            ].filter(p => !isNaN(p.x_pixel) && !isNaN(p.y_pixel) && isFinite(p.y_pixel) && p.y_pixel !== null);
            if (line_points_cortisol.length >= 2) {
                cortisolG.append("path")
                    .datum(line_points_cortisol)
                    .attr("class", "regression-line cortisol-regression")
                    .attr("fill", "none").attr("stroke", "#C77700").attr("stroke-width", 2.5).attr("stroke-dasharray", "5,5").attr("d", lineGenerator);
            }
        }
    }

    function updateHormoneChart() {
        currentXAxisMetric = xAxisMetricSelect.property("value");

        // Update Chart Title
        const selectedMetricText = xAxisMetricSelect.node().selectedOptions[0].text;
        svg.selectAll(".chart-title").remove(); // Remove previous title
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", usableWidth / 2)
            .attr("y", 0 - (margin.top / 2) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(`Hormone Levels vs. ${selectedMetricText}`);

        // Filter data to only include entries where the currentXAxisMetric is valid
        merged_data = merged_data_all_metrics.filter(d => d[currentXAxisMetric] !== null && !isNaN(d[currentXAxisMetric]));

        // Sort data based on the currentXAxisMetric
        if (currentXAxisMetric === 'wakeAfterSleepOnset' || currentXAxisMetric === 'movementIndex' || currentXAxisMetric === 'sleepFragmentationIndex') {
            // For WASO, Movement Index, and Sleep Fragmentation Index, sort descending (higher values first, as lower is better)
            merged_data.sort((a, b) => b[currentXAxisMetric] - a[currentXAxisMetric]);
        } else {
            // For other metrics (efficiency, TST), sort ascending (lower values first)
            merged_data.sort((a, b) => a[currentXAxisMetric] - b[currentXAxisMetric]);
        }

        data_for_regression = merged_data.filter(d => d.user_id !== 12 && d[currentXAxisMetric] !== null && !isNaN(d[currentXAxisMetric]));

        // Update X-scale domain
        xScale = d3.scaleBand()
            .domain(merged_data.map(d => d.user_id.toString()))
            .range([0, usableWidth])
            .padding(0.25);

        // Update Y-scales domains
        const yMelatoninMax = d3.max(merged_data, d => d.melatonin);
        yMelatoninScale = d3.scaleLinear()
            .domain([0, yMelatoninMax > 0 ? yMelatoninMax : 1])
            .nice()
            .range([chartHeight, 0]);

        const yCortisolMax = d3.max(merged_data, d => d.cortisol);
        yCortisolScale = d3.scaleLinear()
            .domain([0, yCortisolMax > 0 ? yCortisolMax : 1])
            .nice()
            .range([0, chartHeight]);


        // Recalculate regressions
        melatonin_regression = calculateLinearRegression(
            data_for_regression,
            d => d[currentXAxisMetric],
            d => d.melatonin
        );
        cortisol_regression = calculateLinearRegression(
            data_for_regression,
            d => d[currentXAxisMetric],
            d => d.cortisol
        );

        // --- Redraw Melatonin Chart ---
        melatoninG.selectAll('*').remove(); // Clear previous elements in melatoninG

        melatoninG.append('g')
            .attr('class', 'grid melatonin-grid')
            .call(d3.axisLeft(yMelatoninScale).ticks(5).tickSize(-usableWidth).tickFormat(''))
            .selectAll(".tick line").attr("stroke", "#e0e0e0").attr("stroke-opacity", 0.7);
        melatoninG.select(".melatonin-grid .domain").remove();

        melatoninG.append('g')
            .attr('class', 'y-axis melatonin-y-axis')
            .call(d3.axisLeft(yMelatoninScale).ticks(5).tickFormat(d3.format(".2e")));

        melatoninG.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)").attr("y", 0 - margin.left + 20).attr("x", 0 - (chartHeight / 2))
            .attr("text-anchor", "middle").style("font-size", "13px").style("font-weight", "500")
            .text("Normalized Melatonin");

        melatoninG.selectAll('.bar-melatonin')
            .data(merged_data, d => d.user_id) // Key function for object constancy
            .join('rect')
            .attr('class', 'bar-melatonin')
            .attr('x', d => xScale(d.user_id.toString()))
            .attr('y', d => yMelatoninScale(d.melatonin))
            .attr('width', xScale.bandwidth())
            .attr('height', d => chartHeight - yMelatoninScale(d.melatonin))
            .attr('fill', '#4A90E2').attr('rx', 4).attr('ry', 4)
            .on('mouseover', function (event, d) {
                d3.select(this).attr('fill', '#7BB6F7');
                showTooltip(event, d, 'melatonin');
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', '#4A90E2');
                hideTooltip();
            });

        drawMelatoninRegressionLine();

        // --- Redraw Cortisol Chart ---
        cortisolG.selectAll('*').remove(); // Clear previous elements in cortisolG

        cortisolG.append('g')
            .attr('class', 'grid cortisol-grid')
            .call(d3.axisLeft(yCortisolScale).ticks(5).tickSize(-usableWidth).tickFormat(''))
            .selectAll(".tick line").attr("stroke", "#e0e0e0").attr("stroke-opacity", 0.7);
        cortisolG.select(".cortisol-grid .domain").remove();

        cortisolG.append('g')
            .attr('class', 'y-axis cortisol-y-axis')
            .call(d3.axisLeft(yCortisolScale).ticks(5).tickFormat(d3.format(".2f")));

        cortisolG.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)").attr("y", 0 - margin.left + 20).attr("x", 0 - (chartHeight / 2))
            .attr("text-anchor", "middle").style("font-size", "13px").style("font-weight", "500")
            .text("Normalized Cortisol");

        cortisolG.selectAll('.bar-cortisol')
            .data(merged_data, d => d.user_id) // Key function
            .join('rect')
            .attr('class', 'bar-cortisol')
            .attr('x', d => xScale(d.user_id.toString()))
            .attr('y', 0)
            .attr('width', xScale.bandwidth())
            .attr('height', d => yCortisolScale(d.cortisol))
            .attr('fill', '#F5A623').attr('rx', 4).attr('ry', 4)
            .on('mouseover', function (event, d) {
                d3.select(this).attr('fill', '#FBCB7A');
                showTooltip(event, d, 'cortisol');
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', '#F5A623');
                hideTooltip();
            });

        drawCortisolRegressionLine();

        // --- Redraw Shared X-axis ---
        svg.selectAll('.shared-x-axis').remove(); // Remove old X-axis
        svg.selectAll('.shared-x-axis-label').remove(); // Remove old X-axis label

        svg.append('g')
            .attr('class', 'x-axis shared-x-axis')
            .attr('transform', `translate(0, ${chartHeight * 2 + gapBetweenCharts})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("text-anchor", "end").attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "rotate(-60)");

        const metricLabel = xAxisMetricSelect.node().selectedOptions[0].text;
        const sortOrderLabel = currentXAxisMetric === 'wakeAfterSleepOnset' || currentXAxisMetric === 'movementIndex' || currentXAxisMetric === 'sleepFragmentationIndex' ? 'High to Low' : 'Low to High';
        svg.append("text")
            .attr("class", "x-axis-label shared-x-axis-label")
            .attr("x", usableWidth / 2)
            .attr("y", (chartHeight * 2 + gapBetweenCharts) + 50)
            .attr("text-anchor", "middle").style("font-size", "15px").style("font-weight", "500")
            .text(`Users (Sorted by ${metricLabel}: ${sortOrderLabel})`);

        // Update chart summary text
        const summaryTextParagraph = d3.select("#hormone-summary p");
        let summaryHtml = "";
        let metricName; // Declare metricName

        // Update metric context box
        const contextBox = d3.select("#hormone-metric-context p");
        let contextHtml = "";

        switch (currentXAxisMetric) {
            case 'avg_efficiency':
                metricName = "Sleep Efficiency";
                contextHtml = `<strong>Sleep Efficiency:</strong> This measures the percentage of time spent asleep while in bed. Higher values (closer to 100%) indicate more consolidated and efficient sleep. It's a primary indicator of overall sleep quality.`;
                summaryHtml = "Higher melatonin levels appear to correlate with improved Sleep Efficiency reflecting melatonins ability to help maintain continuous rest, minimizing nighttime awakenings. An interesting case is <strong>User 12</strong>, who maintains high efficiency but also shows a notable cortisol spike. This spike is likely linked to alcohol consumption before sleep, which is known to elevate cortisol and can negatively impact sleep quality.";
                break;
            case 'totalSleepTime':
                metricName = "Total Sleep Time (TST)";
                contextHtml = `<strong>Total Sleep Time (TST):</strong> This is the total duration of actual sleep obtained during the night, measured in minutes. While more sleep isn't always better if it's fragmented, sufficient TST is crucial for rest and recovery.`;
                summaryHtml = `Although melatonin contributes to an average increase of about 7 minutes in total sleep time across users, the relationship is inconsistent. This highlights that melatonin's primary benefit isn't necessarily in prolonging sleep—but in enhancing its continuity and quality. 
                    Notably, users with lower cortisol levels tend to sleep longer.`;
                break;
            case 'wakeAfterSleepOnset':
                metricName = "Wake After Sleep Onset (WASO)";
                contextHtml = `<strong>Wake After Sleep Onset (WASO):</strong> This metric quantifies the amount of time, in minutes, an individual is awake after initially falling asleep and before their final awakening. Lower WASO values are desirable, indicating more continuous and less interrupted sleep.`;
                summaryHtml = `This chart illustrates melatonin's strongest effect: reducing interruptions during the night. Users with higher melatonin levels generally show lower WASO scores, suggesting they wake up less often and stay asleep more consistently.`;
                break;
            case 'movementIndex':
                metricName = "Movement Index";
                contextHtml = `<strong>Movement Index:</strong> This reflects the amount of physical movement during sleep, typically measured by an actigraph. A lower movement index generally suggests more restful and less disturbed sleep. High movement can indicate restlessness or frequent arousals.`;
                summaryHtml = "Here we can see that melatonin levels appear to be positively correlated with less movement during sleep for most users. This is a desirable outcome, as a lower movement index indicates more stable and restful sleep, which contributes to better overall sleep quality.";
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

    // Initial chart draw
    updateHormoneChart();

    // Event listeners
    if (xAxisMetricSelect.node()) {
        xAxisMetricSelect.on("change", updateHormoneChart);
    }
    if (trendlineCheckbox.node()) {
        trendlineCheckbox.on("change", () => {
            drawMelatoninRegressionLine();
            drawCortisolRegressionLine();
        });
    }
    if (contextToggleCheckbox.node()) {
        // Set initial visibility based on checkbox state
        metricContextDiv.style("display", contextToggleCheckbox.property("checked") ? "block" : "none");

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

function createHeatmap(svg, data, width, height, isSmall = false, legendContainer = null) {
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

        // Bivariate Legend Creation (Modified)
        if (legendContainer) {
            legendContainer.html(''); // Clear previous legend if any

            const legendCellSize = 20;
            const legendPadding = 5;
            const legendTitleHeight = 40; // Space for main title + subtitle
            const legendAxisTitleHeight = 20;
            const legendLabelHeight = 20;
            const legendAxisLabelWidth = 70; // Width for Y-axis HR Zone labels

            const numStepCategories = 3;
            const numHrZones = hrZones.length;

            const legendGridWidth = numStepCategories * (legendCellSize + legendPadding) - legendPadding;
            const legendGridHeight = numHrZones * (legendCellSize + legendPadding) - legendPadding;

            const legendLocalMargin = { top: 10, right: 10, bottom: legendAxisTitleHeight + legendLabelHeight, left: legendAxisLabelWidth };

            const legendSvgWidth = legendLocalMargin.left + legendGridWidth + legendLocalMargin.right;
            const legendSvgHeight = legendLocalMargin.top + legendTitleHeight + legendGridHeight + legendPadding + legendAxisTitleHeight + legendLabelHeight + legendLocalMargin.bottom - 50; // Adjusted bottom spacing

            const legendSvg = legendContainer.append('svg')
                .attr('width', legendSvgWidth)
                .attr('height', legendSvgHeight);

            const legend = legendSvg.append('g')
                .attr('transform', `translate(${legendLocalMargin.left}, ${legendLocalMargin.top})`);

            // Define step intensity categories for the legend
            const stepCategories = [
                { label: 'Low', value: maxSteps / 6, representativeOpacity: opacityScale(maxSteps / 6) },
                { label: 'Med', value: maxSteps / 2, representativeOpacity: opacityScale(maxSteps / 2) },
                { label: 'High', value: 5 * maxSteps / 6, representativeOpacity: opacityScale(5 * maxSteps / 6) }
            ];
            if (maxSteps === 0) { // Handle case with no steps
                stepCategories.forEach(cat => cat.representativeOpacity = opacityScale(0));
            }

            legend.append('text')
                .attr('x', legendGridWidth / 2)
                .attr('y', -legendTitleHeight / 2 + 5) // Adjusted y for centering title
                .attr('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('font-size', '13px')
                .text('Activity Intensity');

            legend.append('text')
                .attr('x', legendGridWidth / 2)
                .attr('y', -legendTitleHeight / 2 + 20) // Adjusted y for subtitle
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .text('(Color: HR Zone, Opacity: Steps)');

            // Create legend cells
            hrZones.forEach((hrZone, i) => {
                stepCategories.forEach((stepCat, j) => {
                    legend.append('rect')
                        .attr('x', j * (legendCellSize + legendPadding))
                        .attr('y', i * (legendCellSize + legendPadding) + legendTitleHeight - 15) // Offset by title height
                        .attr('width', legendCellSize)
                        .attr('height', legendCellSize)
                        .attr('fill', hrZone.color)
                        .attr('opacity', stepCat.representativeOpacity);
                });
            });

            // Add HR Zone labels (Y-axis of legend)
            legend.append('text')
                .attr('x', -legendLocalMargin.left + legendPadding + 15) // Position left of the grid
                .attr('y', legendTitleHeight - legendPadding - 5)
                .attr('text-anchor', 'start')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .text('HR Zone');

            hrZones.forEach((hrZone, i) => {
                legend.append('text')
                    .attr('x', -legendPadding)
                    .attr('y', i * (legendCellSize + legendPadding) + legendCellSize / 2 + legendTitleHeight - 15) // Offset by title height
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', '10px')
                    .text(hrZone.label.split(' ')[0]);
            });

            // Add Steps Intensity labels (X-axis of legend)
            legend.append('text')
                .attr('x', legendGridWidth / 2)
                .attr('y', legendGridHeight + legendTitleHeight + legendPadding) // Position below the grid
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .text('Step Intensity');

            stepCategories.forEach((stepCat, j) => {
                legend.append('text')
                    .attr('x', j * (legendCellSize + legendPadding) + legendCellSize / 2)
                    .attr('y', legendGridHeight + legendTitleHeight + legendPadding + legendLabelHeight - 5) // Position below the axis title
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .text(stepCat.label);
            });
        } // End of if (legendContainer)
    }

    return { maxSteps };
}

async function initActivityChart() {
    const allData = await loadAllUsersData();

    // Create container for small multiples
    const container = d3.select('#activity-chart');

    // Add title
    container.append('h2');

    // Create grid for small multiples
    const grid = container.append('div')
        .attr('class', 'small-multiples-grid')
        .style('grid-template-columns', `repeat(${gridCols}, 1fr)`)
        .style('gap', `${gridPadding}px`);

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
    });

    // Create detail view container (hidden initially)
    const detailContainer = container.append('div')
        .attr('class', 'detail-view');

    function showDetailView(userId) {
        const userData = allData[userId - 1];

        detailContainer.style('display', 'block')
            .html(''); // Clear previous content

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
                // summaryPanel.style('opacity', 0); // Opacity handled by hover now
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
            .attr('class', 'detail-view-close-button')
            .text('Close')
            .on('click', () => {
                detailContainer.style('display', 'none');
            });

        // Create content wrapper for flex layout
        const contentWrapper = detailContainer.append('div')
            .attr('class', 'detail-view-content-wrapper');

        // Create main visualization SVG in the first flex item
        const heatmapSvgContainer = contentWrapper.append('div') // Optional container for SVG if needed for flex
            .attr('class', 'heatmap-svg-container');

        const svg = heatmapSvgContainer.append('svg')
            .attr('width', detailedActivityWidth + activityMargin.left + activityMargin.right)
            .attr('height', detailedActivityHeight + activityMargin.top + activityMargin.bottom)
            .append('g')
            .attr('transform', `translate(${activityMargin.left},${activityMargin.top})`);

        // Create sidebar for summary and legend
        const detailViewSidebar = contentWrapper.append('div')
            .attr('class', 'detail-view-sidebar');

        // Create summary panel in the sidebar
        const summaryPanel = detailViewSidebar.append('div')
            .attr('class', 'summary-panel');

        // Create legend container in the sidebar
        const legendDiv = detailViewSidebar.append('div')
            .attr('class', 'activity-legend-container');

        const activityByTime = processData(userData);
        // Pass legendDiv to createHeatmap
        createHeatmap(svg, userData, detailedActivityWidth, detailedActivityHeight, false, legendDiv);

        // Add hour highlights
        const hourHighlights = svg.append('g')
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

    console.log('First few questionarrie entries:', data.slice(0, 3));
    return data;
}

async function initStressChart() {
    const sleep_data = await loadSleepData();
    const stress_data = await loadStressData();
    createStressSleepVisualization(sleep_data, stress_data);
}

function createStressSleepVisualization(initialSleepData, initialStressData) {
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
        .attr('id', 'trendline-toggle');

    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

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
    // This section replaces the previous fake data block
    const processedStressData = (initialStressData || []).map(d => ({ // Ensure we only take relevant fields if there are others
        user_id: d.user_id,
        Daily_stress: d.Daily_stress,
        Avg_Neg_PANAs: d.Avg_Neg_PANAs
    }));

    const processedSleepData = (initialSleepData || []).map(d => ({ // Ensure we only take relevant fields
        user_id: d.user_id,
        sleepFragmentationIndex: d.sleepFragmentationIndex,
        numberOfAwakenings: d.numberOfAwakenings,
        efficiency: d.efficiency,
        wakeAfterSleepOnset: d.wakeAfterSleepOnset
        // Add other sleep fields if they are directly used by other metrics later
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

    currentXMetric = stressMetrics[0].key;
    currentYMetric = sleepMetrics[0].key;

    updateChart();

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
            .attr('r', 6)
            .attr('cx', d => xScale(d[currentXMetric]))
            .attr('cy', d => yScale(d[currentYMetric]));

        // Trendline Logic
        g.selectAll('.trendline').remove(); // Remove existing trendline before drawing a new one or if toggle is off

        if (trendlineToggle.property('checked') && filteredForChart.length >= 2) {
            // Calculate linear regression
            const n = filteredForChart.length;
            const sumX = d3.sum(filteredForChart, d => d[currentXMetric]);
            const sumY = d3.sum(filteredForChart, d => d[currentYMetric]);
            const sumXY = d3.sum(filteredForChart, d => d[currentXMetric] * d[currentYMetric]);
            const sumXX = d3.sum(filteredForChart, d => d[currentXMetric] * d[currentXMetric]);
            // const sumYY = d3.sum(filteredForChart, d => d[currentYMetric] * d[currentYMetric]); // Not needed for slope/intercept

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;

            // Determine start and end points of the trendline based on the xScale domain
            const xDomain = xScale.domain();
            const trendlineData = [
                { x: xDomain[0], y: slope * xDomain[0] + intercept },
                { x: xDomain[1], y: slope * xDomain[1] + intercept }
            ];

            g.append('line')
                .attr('class', 'trendline')
                .attr('x1', xScale(trendlineData[0].x))
                .attr('y1', yScale(trendlineData[0].y))
                .attr('x2', xScale(trendlineData[1].x))
                .attr('y2', yScale(trendlineData[1].y))
                .attr('stroke', 'red')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');
        }

        g.selectAll('.dot')
            .on('mouseover', function (event, d) {
                d3.select(this).transition().duration(100);
                tooltip.transition().duration(200);
                tooltip.html(`<strong>User ID: ${d.user_id}</strong><br/>
                    ${stressMetricSelect.node().selectedOptions[0].text}: ${Number(d[currentXMetric]).toFixed(2)}<br/>
                    ${sleepMetricSelect.node().selectedOptions[0].text}: ${Number(d[currentYMetric]).toFixed(2)}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).transition().duration(100).attr('r', 6);
                tooltip.transition().duration(500);
            });
    }

    stressMetricSelect.on('change', function () {
        currentXMetric = this.value;
        updateChart();
    });

    sleepMetricSelect.on('change', function () {
        currentYMetric = this.value;
        updateChart();
    });

    // Add event listener for the trendline toggle
    trendlineToggle.on('change', function () {
        updateChart();
    });
}

// Initalize All Viusualizations on Start-Up. 
initStressChart();
initActivityChart();
initSleepChart();
initHormoneChart();