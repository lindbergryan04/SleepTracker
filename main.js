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
