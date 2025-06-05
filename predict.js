document.addEventListener("DOMContentLoaded", function () {
  console.log("Page loaded");

  let dataset = [];
  const activities = [
    'nap', 'laying down', 'sitting', 'light movement', 'medium movement',
    'heavy activity', 'eating', 'small screen', 'large screen',
    'caffeinated drink', 'smoking', 'alcohol'
  ];

  // Enhanced color scheme for activities
  const activityColors = {
    'nap': '#264653',          // Dark blue
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
    'nap': '😴',
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

    // Update time labels
    const timeLabels = timelineContainer.append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("margin-bottom", "20px")
      .style("padding", "0 20px");

    // Create time labels from 12am to 12am in 3-hour intervals
    for (let hour = 0; hour <= 24; hour += 3) {
      const displayHour = hour === 0 || hour === 24 ? 12 : (hour > 12 ? hour - 12 : hour);
      const amPm = (hour >= 12 && hour < 24) ? 'PM' : 'AM';
      timeLabels.append("div")
        .style("position", "relative")
        .style("width", "1px")
        .html(`
          <span style="position: absolute; transform: translateX(-50%); color: #666; font-size: 12px;">
            ${displayHour}${amPm}
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
        // Clear prediction results
        d3.select("#result").html("");
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

  // Add activity advice rules
  const activityAdviceRules = {
    'heavy activity': {
      good: 'Great job on getting significant heavy activity! This is excellent for promoting deep, restorative sleep.',
      bad: 'Consider incorporating more vigorous exercise. Even 15-30 minutes can significantly improve deep sleep quality.',
      check: (user, best) => user >= 15 && user >= best * 0.8,
      recommendation_type: 'more_is_better',
      minimum_threshold: 15
    },
    'nap': {
      good: 'Your nap duration is well-balanced. Short naps can boost alertness without disrupting nighttime sleep.',
      bad: 'Try to keep naps between 20-30 minutes. Longer naps might make it harder to fall asleep at night.',
      check: (user, best) => user >= 20 && user <= 30,
      recommendation_type: 'optimal_range',
      min_nap: 20,
      max_nap: 30
    },
    'light movement': {
      good: 'You have a good amount of light movement. This helps maintain healthy circadian rhythms and overall well-being.',
      bad: 'Try to increase your light movement throughout the day. Aim for at least 60 minutes. Regular walks or standing breaks can contribute to better sleep patterns.',
      check: (user, best) => user >= 60 && user >= best * 0.7,
      recommendation_type: 'more_is_better',
      minimum_threshold: 60
    },
    'medium movement': {
      good: 'Your medium activity level is well-balanced. This is beneficial for energy expenditure and sleep regulation.',
      bad: 'Adding some moderate activities like brisk walking or cycling could further enhance your sleep quality. Aim for at least 30 minutes.',
      check: (user, best) => user >= 30 && user >= best * 0.7,
      recommendation_type: 'more_is_better',
      minimum_threshold: 30
    },
    'alcohol': {
      good: 'Excellent! Minimizing or avoiding alcohol is one of the best things you can do for undisrupted, high-quality sleep.',
      bad: 'Reducing alcohol intake, especially in the hours before bed, can significantly decrease night-time awakenings and improve sleep architecture.',
      check: (user, best) => user <= Math.max(15, best * 1.2),
      recommendation_type: 'less_is_better'
    },
    'caffeinated drink': {
      good: 'Well done on limiting caffeine! This helps ensure caffeine doesn\'t interfere with your ability to fall asleep.',
      bad: 'Be mindful of caffeine intake, especially in the afternoon and evening. It can delay sleep onset and reduce sleep quality. Aim for zero in the 6-8 hours before bed.',
      check: (user, best) => user <= Math.max(15, best * 1.2),
      recommendation_type: 'less_is_better'
    },
    'large screen': {
      good: 'Low screen time helps your melatonin stay high.',
      bad: 'Too much screen time suppresses melatonin — try reducing it before bed.',
      check: (user, best) => user <= Math.max(30, best * 1.2) && user <= 120,
      recommendation_type: 'less_is_better'
    },
    'small screen': {
      good: 'You are managing your small screen time well before bed. This is beneficial for winding down.',
      bad: 'Excessive small screen (phone, tablet) use before bed can delay sleep. Consider setting a screen curfew or using blue light filters, aiming for under 30-60 minutes in the hour before sleep.',
      check: (user, best) => user <= 30,
      recommendation_type: 'less_is_better'
    },
    'eating': {
      good: 'Timing your meals well can positively impact sleep. Avoiding large meals close to bedtime is generally good.',
      bad: 'Try to finish your last large meal at least 2-3 hours before bedtime. Eating too close to sleep can cause discomfort and interfere with sleep quality.',
      check: (user, best) => user < 120,
      recommendation_type: 'complex'
    },
    'laying down': {
      good: 'Adequate relaxation time can be beneficial, as long as it doesn\'t excessively reduce sleep or activity time.',
      bad: 'While rest is good, ensure that extended periods of laying down while awake, especially in bed, are not indicative of difficulty sleeping or excessive inactivity. If you can\'t sleep, get out of bed for a short while.',
      check: (user,best) => user < Math.min(best * 1.5, 180),
      recommendation_type: 'complex'
    },
    'sitting': {
      good: 'You seem to have a balanced amount of sitting time. Breaking up long sitting periods is beneficial.',
      bad: 'Prolonged sitting can impact overall health and potentially sleep. Try to incorporate short breaks to stand or walk every hour. Aim for less than 8 hours of total sitting if possible.',
      check: (user,best) => user < Math.min(best * 1.3, 8*60),
      recommendation_type: 'less_is_better_general'
    },
    'smoking': {
      good: 'Excellent! Avoiding smoking is crucial for overall health and good sleep.',
      bad: 'Smoking, especially close to bedtime, can negatively impact sleep due to the stimulant effects of nicotine. Quitting smoking is highly recommended for better sleep and health.',
      check: (user, best) => user === 0,
      recommendation_type: 'less_is_better'
    }
  };

  function generateSleepAdvice(userDurations, bestMatchDurations) {
    const adviceList = [];

    Object.keys(activityAdviceRules).forEach(activity => {
      const rule = activityAdviceRules[activity];
      const userMinutes = userDurations[activity] || 0;

      // If user didn't input this activity (duration is 0), don't mention it, UNLESS it's nap.
      if (userMinutes === 0 && activity !== 'nap') {
        return; // Skips to the next iteration of forEach
      }
      
      let isGood = false;
      // The `check` function in activityAdviceRules should primarily use userMinutes and rule-specific thresholds/logic.
      // `bestMatchDurations[activity]` is passed here mainly for compatibility with the existing `check` function signatures you had,
      // but the advice text generation below will NOT use bestMatchDurations for comparisons.
      if (rule.check) {
          isGood = rule.check(userMinutes, bestMatchDurations[activity] || 0, rule.minimum_threshold);
      }

      let adviceMessage = isGood ? rule.good : rule.bad;
      
      // Enhance "bad" advice messages with specific, general guidance, not bestMatch comparisons.
      if (!isGood) {
          if (rule.recommendation_type === 'more_is_better' && rule.minimum_threshold !== undefined) {
              adviceMessage = rule.bad; // Start with the general bad message.
              adviceMessage += ` You currently have ${userMinutes} minutes. Aim for at least ${rule.minimum_threshold} minutes for this activity.`;
          } else if (rule.recommendation_type === 'less_is_better') {
              adviceMessage = rule.bad; // Start with the general bad message.
              let idealTarget = "as little as reasonably possible";
              if (activity === 'alcohol' || activity === 'smoking') idealTarget = "0 minutes, especially before bed";
              else if (activity.includes('screen')) idealTarget = "under 30-60 minutes in the hour or two before trying to sleep";
              
              // Provide this specific advice if the user actually logged time, or for certain critical activities even if 0 but !isGood.
              if (userMinutes > 0 || (activity === 'alcohol' || activity === 'smoking' || activity.includes('screen'))) {
                 adviceMessage += ` Aim for less. For ${activity}, the ideal is often ${idealTarget}.`;
              }
          } else if (rule.recommendation_type === 'optimal_range' && activity === 'nap') {
              // The base `adviceMessage` is already `rule.bad` (which now states the 7-9hr goal) because `!isGood`.
              if (userMinutes === 0) { 
                adviceMessage += ` Getting enough sleep is crucial for your health and well-being.`;
              } else if (userMinutes < rule.min_sleep) {
                adviceMessage += ` Your current sleep of ${(userMinutes/60).toFixed(1)} hours is below this range. Try to get approximately ${((rule.min_sleep - userMinutes)/60).toFixed(1)} more hours of sleep.`;
              } else if (userMinutes > rule.max_sleep) {
                adviceMessage += ` Your current sleep of ${(userMinutes/60).toFixed(1)} hours is above this range. While individual needs can vary, consistently sleeping too long might be a concern for some. Consider adjusting towards the 7-9 hour window.`;
              } else {
                // This handles the unlikely case where !isGood but userMinutes is technically within min_sleep and max_sleep 
                // (e.g. if check logic became more complex). The base rule.bad message would stand.
                // Or if rule.bad wasn't already set, this would be a fallback, but it is.
              }
          } else if (activity === 'sitting' && rule.recommendation_type === 'less_is_better_general') {
                adviceMessage = rule.bad; // Start with general bad message
                if (userMinutes >= (8*60)) { 
                    adviceMessage += ` You currently have ${(userMinutes/60).toFixed(1)} hours of sitting. Consider reducing this and taking regular breaks.`;
                } else if (userMinutes >= (6*60)) { 
                    adviceMessage += ` Consider incorporating more breaks to stand or walk if you sit for long periods.`;
                }
          }
          // For 'complex' types or other unhandled 'bad' cases, the base `rule.bad` message is used as set initially.
      }
      // If `isGood` is true, `adviceMessage` is already `rule.good`. No further changes are needed as we are not comparing to bestMatchUser.

      adviceList.push({
        type: isGood ? 'good' : 'bad',
        message: adviceMessage,
        activity: activity,
        userMinutes: userMinutes,
        bestMatchMinutes: bestMatchDurations[activity] || 0, // Kept for data integrity, not for display/advice text generation.
        recommendation_type: rule.recommendation_type
      });
    });
    return adviceList;
  }

  window.predict = function () {
    console.log("Predict function called");
    console.log("Dataset length:", dataset.length);
    
    if (dataset.length === 0) {
      console.log("Dataset is empty!");
      alert("Dataset not loaded yet. Please wait.");
      return;
    }

    if (state.every(s => s === 'empty')) {
      console.log("Timeline is empty!");
      alert("Please fill in your timeline before predicting.");
      return;
    }

    // Convert timeline state to activity durations
    const activityDurations = activities.reduce((acc, activity) => {
      acc[activity] = state.filter(s => s === activity).length * 15;
      return acc;
    }, {});
    console.log("Activity durations:", activityDurations);

    let bestMatch = null;
    let bestDist = Infinity;

    dataset.forEach(user => {
      const userVec = activities.map(a => a === 'nap' ? user['sleeping'] : user[a]);
      const dist = euclidean(activities.map(a => activityDurations[a]), userVec);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = user;
      }
    });

    console.log("Best match found:", bestMatch);

    if (!bestMatch) {
      console.log("No best match found!");
      return;
    }

    const resultDiv = d3.select("#result");
    console.log("Result div:", resultDiv.node());
    
    // Clear and set up the result div
    resultDiv.html("")
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

    // Get best match durations for advice
    const bestMatchDurations = activities.reduce((acc, activity) => {
      if (activity === 'nap') {
        acc[activity] = bestMatch['sleeping'] || 0;
      } else {
        acc[activity] = bestMatch[activity] || 0;
      }
      return acc;
    }, {});

    // Add advice section
    const adviceSection = resultDiv.append("div")
      .style("margin-top", "30px")
      .style("padding", "20px")
      .style("background-color", "#f8f9fa")
      .style("border-radius", "12px")
      .style("border", "1px solid #e9ecef");

    adviceSection.append("h4")
      .text("Our Recommendations For Better Sleep")
      .style("margin", "0 0 15px 0")
      .style("color", "#333")
      .style("text-align", "center");

    const advice = generateSleepAdvice(activityDurations, bestMatchDurations);
    
    const adviceList = adviceSection.append("ul")
      .style("list-style-type", "none")
      .style("padding", "0")
      .style("margin", "0");

    adviceList.selectAll("li")
      .data(advice)
      .enter()
      .append("li")
      .style("background-color", "#ffffff")
      .style("border-radius", "8px")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.08)")
      .style("padding", "15px")
      .style("margin-bottom", "15px")
      .style("display", "flex")
      .style("align-items", "flex-start")
      .style("border-left", d => `6px solid ${d.type === 'good' ? '#4CAF50' : '#FFC107'}`)
      .html(d => {
        const typeIcon = d.type === 'good' ? '✔' : '💡';
        const iconColor = d.type === 'good' ? '#4CAF50' : '#FFC107';
        const activityName = d.activity.charAt(0).toUpperCase() + d.activity.slice(1);
        const currentActivityIcon = activityIcons[d.activity] || '•';

        return `
          <div style="flex-shrink: 0; margin-right: 12px; font-size: 1.6em; color: ${iconColor}; line-height: 1.2; margin-top: -1px;">
            ${typeIcon}
          </div>
          <div style="flex-grow: 1;">
            <strong style="display: block; margin-bottom: 6px; font-size: 1.05em; color: #2c3e50;">
              <span style="font-size: 1.1em; margin-right: 5px;">${currentActivityIcon}</span>${activityName}
            </strong>
            <span style="font-size: 0.95em; color: #555e68; line-height: 1.5;">
              ${d.message}
            </span>
          </div>
        `;
      });

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
