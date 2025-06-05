document.addEventListener("DOMContentLoaded", function () {
  console.log("Page loaded");

  let dataset = [];
  const activities = [
    'sleeping', 'laying down', 'sitting', 'light movement', 'medium movement',
    'heavy activity', 'eating', 'small screen', 'large screen',
    'caffeinated drink', 'smoking', 'alcohol'
  ];

  // Enhanced color scheme for activities
  const activityColors = {
    'sleeping': '#264653',          // Dark blue
    'laying down': '#2a9d8f',       // Teal
    'sitting': '#8ab17d',           // Sage green
    'light movement': '#e9c46a',    // Yellow
    'medium movement': '#f4a261',   // Light orange
    'heavy activity': '#e76f51',    // Orange red
    'eating': '#277da1',           // Blue
    'small screen': '#577590',      // Steel blue
    'large screen': '#4d908e',      // Blue green
    'caffeinated drink': '#43aa8b', // Green
    'smoking': '#90be6d',          // Light green
    'alcohol': '#f9c74f',          // Gold
    'empty': '#f8f9fa'             // Light gray
  };

  // Activity icons (using emoji as placeholders - you can replace with SVG icons)
  const activityIcons = {
    'sleeping': '😴',
    'laying down': '🛋️',
    'sitting': '💺',
    'light movement': '🚶',
    'medium movement': '🚶‍♂️',
    'heavy activity': '🏃‍♂️',
    'eating': '🍽️',
    'small screen': '📱',
    'large screen': '📺',
    'caffeinated drink': '☕',
    'smoking': '🚬',
    'alcohol': '🍷',
    'empty': '⬜'
  };

  // Timeline state: 24 hours x 4 (15-minute intervals)
  const timeSlots = 24 * 4;
  const state = Array(timeSlots).fill('empty');
  let currentActivity = 'empty';
  let isDrawing = false;

  d3.json("merged_user_data.json").then(data => {
    console.log("JSON loaded:", data);
    dataset = data;

    const container = d3.select("#sliders");
    container.html(""); // Clear existing content

    // Create main container with modern styling
    const mainContainer = container.append("div")
      .style("max-width", "1200px")
      .style("margin", "0 auto")
      .style("padding", "20px")
      .style("font-family", "system-ui, -apple-system, sans-serif");

    // Create activity selector panel
    const selectorPanel = mainContainer.append("div")
      .style("background-color", "#fff")
      .style("border-radius", "12px")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
      .style("padding", "20px")
      .style("margin-bottom", "20px");

    selectorPanel.append("h3")
      .text("Select Activity")
      .style("margin", "0 0 15px 0")
      .style("color", "#333");

    // Create activity buttons grid
    const activityGrid = selectorPanel.append("div")
      .style("display", "grid")
      .style("grid-template-columns", "repeat(auto-fill, minmax(150px, 1fr))")
      .style("gap", "10px")
      .style("margin-bottom", "20px");

    // Add activity buttons
    activities.forEach(activity => {
      const button = activityGrid.append("div")
        .attr("class", "activity-button")
        .style("display", "flex")
        .style("align-items", "center")
        .style("padding", "10px")
        .style("border-radius", "8px")
        .style("border", "2px solid transparent")
        .style("background-color", activityColors[activity] + '20')
        .style("cursor", "pointer")
        .style("transition", "all 0.2s ease")
        .on("click", function() {
          // Remove active state from all buttons
          activityGrid.selectAll(".activity-button")
            .style("border-color", "transparent")
            .style("transform", "scale(1)");
          
          // Set active state
          d3.select(this)
            .style("border-color", activityColors[activity])
            .style("transform", "scale(1.02)");
          
          currentActivity = activity;
        })
        .on("mouseover", function() {
          d3.select(this)
            .style("transform", "scale(1.02)");
        })
        .on("mouseout", function() {
          if (currentActivity !== activity) {
            d3.select(this)
              .style("transform", "scale(1)");
          }
        });

      button.append("span")
        .text(activityIcons[activity])
        .style("font-size", "20px")
        .style("margin-right", "8px");

      button.append("span")
        .text(activity)
        .style("color", activityColors[activity])
        .style("font-weight", "500");
    });

    // Create timeline container
    const timelineContainer = mainContainer.append("div")
      .style("background-color", "#fff")
      .style("border-radius", "12px")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
      .style("padding", "20px")
      .style("margin-top", "20px");

    timelineContainer.append("h3")
      .text("Your Daily Timeline")
      .style("margin", "0 0 20px 0")
      .style("color", "#333");

    // Add time labels
    const timeLabels = timelineContainer.append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("margin-bottom", "20px")
      .style("padding", "0 20px");

    for (let i = 0; i <= 24; i += 3) {
      timeLabels.append("div")
        .style("position", "relative")
        .style("width", "1px")
        .html(`
          <span style="position: absolute; transform: translateX(-50%); color: #666; font-size: 12px;">
            ${i.toString().padStart(2, '0')}:00
          </span>
        `);
    }

    // Create timeline
    const timeline = timelineContainer.append("div")
      .style("display", "flex")
      .style("height", "80px")
      .style("background-color", "#f8f9fa")
      .style("border-radius", "8px")
      .style("overflow", "hidden");

    // Add timeline segments
    const segments = timeline.selectAll(".segment")
      .data(state)
      .enter()
      .append("div")
      .attr("class", "segment")
      .style("flex", "1")
      .style("height", "100%")
      .style("background-color", d => activityColors[d])
      .style("transition", "background-color 0.2s ease, opacity 0.2s ease")
      .style("cursor", "pointer")
      .on("mousedown", function() {
        isDrawing = true;
        if (currentActivity !== 'empty') {
          const index = d3.select(this.parentNode).selectAll(".segment").nodes().indexOf(this);
          state[index] = currentActivity;
          d3.select(this)
            .style("background-color", activityColors[currentActivity]);
          updateDurations();
        }
      })
      .on("mouseover", function() {
        if (isDrawing && currentActivity !== 'empty') {
          const index = d3.select(this.parentNode).selectAll(".segment").nodes().indexOf(this);
          state[index] = currentActivity;
          d3.select(this)
            .style("background-color", activityColors[currentActivity]);
          updateDurations();
        } else if (currentActivity !== 'empty') {
          d3.select(this).style("opacity", 0.7);
        }
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 1);
      });

    // Add mouseup event to window
    d3.select(window).on("mouseup", () => {
      isDrawing = false;
    });

    // Add clear button
    const buttonContainer = timelineContainer.append("div")
      .style("display", "flex")
      .style("justify-content", "flex-end")
      .style("margin-top", "15px");

    buttonContainer.append("button")
      .text("Clear Timeline")
      .style("padding", "8px 16px")
      .style("border", "none")
      .style("border-radius", "6px")
      .style("background-color", "#f8f9fa")
      .style("color", "#666")
      .style("cursor", "pointer")
      .style("transition", "all 0.2s ease")
      .style("font-weight", "500")
      .on("mouseover", function() {
        d3.select(this)
          .style("background-color", "#e9ecef");
      })
      .on("mouseout", function() {
        d3.select(this)
          .style("background-color", "#f8f9fa");
      })
      .on("click", function() {
        state.fill('empty');
        timeline.selectAll(".segment")
          .style("background-color", activityColors.empty);
        updateDurations();
      });

    // Create durations display
    const durationsDisplay = mainContainer.append("div")
      .style("background-color", "#fff")
      .style("border-radius", "12px")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.1)")
      .style("padding", "20px")
      .style("margin-top", "20px");

    durationsDisplay.append("h3")
      .text("Activity Summary")
      .style("margin", "0 0 15px 0")
      .style("color", "#333");

    const durationsGrid = durationsDisplay.append("div")
      .attr("class", "durations-grid")
      .style("display", "grid")
      .style("grid-template-columns", "repeat(auto-fill, minmax(200px, 1fr))")
      .style("gap", "15px");

    function updateDurations() {
      const durations = activities.reduce((acc, activity) => {
        acc[activity] = state.filter(s => s === activity).length * 15;
        return acc;
      }, {});

      // Update durations display
      durationsGrid.selectAll(".duration-item").remove();

      activities.forEach(activity => {
        if (durations[activity] > 0) {
          const item = durationsGrid.append("div")
            .attr("class", "duration-item")
            .style("display", "flex")
            .style("align-items", "center")
            .style("padding", "10px")
            .style("background-color", activityColors[activity] + '20')
            .style("border-radius", "8px");

          item.append("span")
            .text(activityIcons[activity])
            .style("font-size", "20px")
            .style("margin-right", "10px");

          const textContainer = item.append("div");
          
          textContainer.append("div")
            .text(activity)
            .style("font-weight", "500")
            .style("color", activityColors[activity]);

          textContainer.append("div")
            .text(`${durations[activity]} minutes`)
            .style("font-size", "12px")
            .style("color", "#666");
        }
      });
    }

    updateDurations();

    // Style the predict button
    const predictButton = d3.select("#predictButton");
    if (!predictButton.empty()) {
      predictButton
        .style("background-color", "#277da1") // A nice blue
        .style("color", "white")
        .style("padding", "10px 20px")
        .style("border", "none")
        .style("border-radius", "8px")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .style("cursor", "pointer")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
        .style("transition", "background-color 0.2s ease, transform 0.2s ease")
        .on("mouseover", function() { 
          d3.select(this).style("background-color", "#216c8c").style("transform", "translateY(-1px)");
        })
        .on("mouseout", function() { 
          d3.select(this).style("background-color", "#277da1").style("transform", "translateY(0px)");
        });
    } else {
      console.warn("Predict button with ID #predictButton not found. Styling not applied.");
    }

  });

  window.predict = function () {
    if (dataset.length === 0) {
      alert("Dataset not loaded yet. Please wait.");
      return;
    }
    if (state.every(s => s === 'empty')) {
      alert("Please fill in your timeline before predicting.");
      return;
    }

    // Convert timeline state to activity durations
    const activityDurations = activities.reduce((acc, activity) => {
      acc[activity] = state.filter(s => s === activity).length * 15;
      return acc;
    }, {});

    const input = normalize(Object.values(activityDurations), dataset);
    let bestMatch = null;
    let bestDist = Infinity;

    dataset.forEach(user => {
      const userVec = activities.map(a => user[a]);
      const dist = euclidean(input, userVec);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = user;
      }
    });

    const resultDiv = d3.select("#result");
    resultDiv.html("") // Clear previous results
      .style("margin-top", "30px")
      .style("padding", "20px")
      .style("background-color", "#ffffff")
      .style("border-radius", "12px")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)");

    resultDiv.append("h3")
      .text("Sleep Prediction Results")
      .style("margin", "0 0 20px 0")
      .style("color", "#333")
      .style("text-align", "center");

    const matchInfoCard = resultDiv.append("div")
      .style("padding", "30px")
      .style("background-color", "#f8f9fa")
      .style("border-radius", "12px")
      .style("border", "1px solid #e9ecef")
      .style("text-align", "center");

    // Add matched user icon and ID
    const headerSection = matchInfoCard.append("div")
      .style("margin-bottom", "25px");

    headerSection.append("div")
      .style("font-size", "48px")
      .style("margin-bottom", "10px")
      .text("👤");

    headerSection.append("h4")
      .text(`User ${bestMatch.user.replace('user_', '')}`)
      .style("margin", "0")
      .style("color", "#277da1")
      .style("font-size", "24px");

    // Create metrics grid
    const metricsGrid = matchInfoCard.append("div")
      .style("display", "grid")
      .style("grid-template-columns", "1fr 1fr")
      .style("gap", "20px")
      .style("margin-top", "20px");

    // Sleep Time Metric
    const sleepTimeCard = metricsGrid.append("div")
      .style("padding", "20px")
      .style("background-color", "#ffffff")
      .style("border-radius", "8px")
      .style("border", "1px solid #e9ecef");

    sleepTimeCard.append("div")
      .text("😴")
      .style("font-size", "24px")
      .style("margin-bottom", "10px");

    sleepTimeCard.append("div")
      .text("Sleep Time")
      .style("color", "#666")
      .style("font-size", "14px")
      .style("margin-bottom", "5px");

    const sleepTimeHours = (bestMatch["Total Sleep Time"] / 60).toFixed(1);
    sleepTimeCard.append("div")
      .text(`${sleepTimeHours} hours`)
      .style("color", "#333")
      .style("font-size", "20px")
      .style("font-weight", "600");

    // Fragmentation Metric
    const fragmentationCard = metricsGrid.append("div")
      .style("padding", "20px")
      .style("background-color", "#ffffff")
      .style("border-radius", "8px")
      .style("border", "1px solid #e9ecef");

    fragmentationCard.append("div")
      .text("📊")
      .style("font-size", "24px")
      .style("margin-bottom", "10px");

    fragmentationCard.append("div")
      .text("Sleep Fragmentation")
      .style("color", "#666")
      .style("font-size", "14px")
      .style("margin-bottom", "5px");

    fragmentationCard.append("div")
      .text(bestMatch["Sleep Fragmentation Index"].toFixed(2))
      .style("color", "#333")
      .style("font-size", "20px")
      .style("font-weight", "600");

    // Create sleep metrics comparison visualization
    createSleepMetricsComparison(dataset, bestMatch);
  };

  function euclidean(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  }

  function normalize(input, data) {
    const mins = [], maxs = [];
    activities.forEach((act, i) => {
      const values = data.map(d => d[act]);
      mins.push(Math.min(...values));
      maxs.push(Math.max(...values));
    });
    return input.map((val, i) => (val - mins[i]) / (maxs[i] - mins[i]));
  }

  function createSleepMetricsComparison(dataset, bestMatch) {
    // Create container for the comparison graphs
    const comparisonContainer = d3.select("#result")
      .append("div")
      .style("margin-top", "30px")
      .style("display", "grid")
      .style("grid-template-columns", "1fr 1fr")
      .style("gap", "20px");

    // Sleep Time Distribution Graph
    const sleepTimeContainer = comparisonContainer.append("div")
      .style("background-color", "#ffffff")
      .style("border-radius", "12px")
      .style("border", "1px solid #e9ecef")
      .style("padding", "20px");

    sleepTimeContainer.append("h4")
      .text("Sleep Time Distribution")
      .style("margin", "0 0 20px 0")
      .style("color", "#333")
      .style("text-align", "center");

    const sleepTimeSvg = sleepTimeContainer.append("svg")
      .attr("width", "100%")
      .attr("height", "200")
      .attr("viewBox", "0 0 400 200")
      .style("overflow", "visible");

    // Fragmentation Index Distribution Graph
    const fragIndexContainer = comparisonContainer.append("div")
      .style("background-color", "#ffffff")
      .style("border-radius", "12px")
      .style("border", "1px solid #e9ecef")
      .style("padding", "20px");

    fragIndexContainer.append("h4")
      .text("Sleep Fragmentation Index Distribution")
      .style("margin", "0 0 20px 0")
      .style("color", "#333")
      .style("text-align", "center");

    const fragIndexSvg = fragIndexContainer.append("svg")
      .attr("width", "100%")
      .attr("height", "200")
      .attr("viewBox", "0 0 400 200")
      .style("overflow", "visible");

    // Common margins for both graphs
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // Create sleep time distribution
    const sleepTimeG = sleepTimeSvg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add tooltip div
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("color", "#333")
      .style("pointer-events", "none")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("z-index", "9999");

    const sleepTimes = dataset.map(d => ({
      value: d["Total Sleep Time"] / 60,
      user: d.user
    }));

    const sleepTimeScale = d3.scaleLinear()
      .domain([0, d3.max(sleepTimes, d => d.value)])
      .range([0, width]);

    // Function to calculate vertical position to avoid overlaps
    function calculateJitter(data, scale, radius = 4, padding = 2) {
      const positions = new Map(); // Store final positions
      const epsilon = 0.01; // Small value to compare floating points
      
      data.sort((a, b) => a.value - b.value).forEach(d => {
        const x = scale(d.value);
        let y = height/2;
        let shift = radius + padding;
        let iteration = 0;
        
        // Try positions above and below center until no overlap
        while (iteration < 50) { // Limit iterations to prevent infinite loops
          let hasOverlap = false;
          
          // Check for overlaps with existing points
          for (const [key, pos] of positions.entries()) {
            const xDiff = Math.abs(x - pos.x);
            if (xDiff < (radius * 2 + padding)) {
              const yDiff = Math.abs(y - pos.y);
              if (yDiff < (radius * 2 + padding)) {
                hasOverlap = true;
                break;
              }
            }
          }
          
          if (!hasOverlap) {
            break;
          }
          
          // Alternate between moving up and down
          shift = (iteration % 2 === 0 ? 1 : -1) * (radius + padding) * (Math.floor(iteration/2) + 1);
          y = height/2 + shift;
          iteration++;
        }
        
        positions.set(d.user, {x, y});
      });
      
      return positions;
    }

    // Calculate jittered positions for sleep times
    const sleepTimePositions = calculateJitter(sleepTimes, sleepTimeScale);

    // Add X axis
    sleepTimeG.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(sleepTimeScale)
        .ticks(5)
        .tickFormat(d => d + "h"));

    // Add dots for each user with jittered positions
    sleepTimeG.selectAll("circle")
      .data(sleepTimes)
      .join("circle")
      .attr("cx", d => sleepTimePositions.get(d.user).x)
      .attr("cy", d => sleepTimePositions.get(d.user).y)
      .attr("r", 4)
      .attr("fill", d => d.user === bestMatch.user ? "#277da1" : "#e9ecef")
      .attr("stroke", "#277da1")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        const circle = d3.select(event.currentTarget);
        circle.attr("r", 6)
          .style("cursor", "pointer");
        
        tooltip
          .style("opacity", .9)
          .html(`<strong>User ${d.user.replace('user_', '')}</strong><br/>Sleep Time: ${d.value.toFixed(1)} hours`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", (event) => {
        const circle = d3.select(event.currentTarget);
        circle.attr("r", 4);
        tooltip.style("opacity", 0);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      });

    // Add highlight line for predicted user's sleep time
    const predictedSleepTime = bestMatch["Total Sleep Time"] / 60;
    sleepTimeG.append("line")
      .attr("x1", sleepTimeScale(predictedSleepTime))
      .attr("x2", sleepTimeScale(predictedSleepTime))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#277da1")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");

    // Fragmentation Index visualization
    const fragIndexG = fragIndexSvg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const fragIndices = dataset.map(d => ({
      value: d["Sleep Fragmentation Index"],
      user: d.user
    }));

    const fragIndexScale = d3.scaleLinear()
      .domain([0, d3.max(fragIndices, d => d.value)])
      .range([0, width]);

    // Calculate jittered positions for fragmentation indices
    const fragIndexPositions = calculateJitter(fragIndices, fragIndexScale);

    // Add X axis
    fragIndexG.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(fragIndexScale)
        .ticks(5));

    // Add dots for each user with jittered positions
    fragIndexG.selectAll("circle")
      .data(fragIndices)
      .join("circle")
      .attr("cx", d => fragIndexPositions.get(d.user).x)
      .attr("cy", d => fragIndexPositions.get(d.user).y)
      .attr("r", 4)
      .attr("fill", d => d.user === bestMatch.user ? "#277da1" : "#e9ecef")
      .attr("stroke", "#277da1")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => {
        const circle = d3.select(event.currentTarget);
        circle.attr("r", 6)
          .style("cursor", "pointer");
        
        tooltip
          .style("opacity", .9)
          .html(`<strong>User ${d.user.replace('user_', '')}</strong><br/>Fragmentation Index: ${d.value.toFixed(2)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", (event) => {
        const circle = d3.select(event.currentTarget);
        circle.attr("r", 4);
        tooltip.style("opacity", 0);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      });

    // Add highlight line for predicted user's fragmentation index
    const predictedFragIndex = bestMatch["Sleep Fragmentation Index"];
    fragIndexG.append("line")
      .attr("x1", fragIndexScale(predictedFragIndex))
      .attr("x2", fragIndexScale(predictedFragIndex))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#277da1")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");

    // Add tooltips for the highlighted values
    sleepTimeContainer.append("div")
      .style("text-align", "center")
      .style("margin-top", "10px")
      .style("color", "#666")
      .html(`Predicted user's sleep time: <strong>${predictedSleepTime.toFixed(1)} hours</strong>`);

    fragIndexContainer.append("div")
      .style("text-align", "center")
      .style("margin-top", "10px")
      .style("color", "#666")
      .html(`Predicted user's fragmentation index: <strong>${predictedFragIndex.toFixed(2)}</strong>`);
  }
});
