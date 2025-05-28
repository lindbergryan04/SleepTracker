let dataset = [];
const activities = [
  'sleeping', 'laying down', 'sitting', 'light movement', 'medium movement',
  'heavy activity', 'eating', 'small screen', 'large screen',
  'caffeinated drink', 'smoking', 'alcohol'
];
const state = Array(12).fill(0);

// Load dataset
d3.json("merged_user_data.json").then(data => {
  dataset = data;
});

const sliders = d3.select("#sliders");
activities.forEach((act, i) => {
  const group = sliders.append("div").attr("class", "slider-group");
  group.append("label").text(`${act}:`);
  group.append("input")
    .attr("type", "range")
    .attr("min", 0).attr("max", 500).attr("value", 0)
    .on("input", function () {
      state[i] = +this.value;
    });
});

function predict() {
  if (dataset.length === 0) return;

  const input = normalize(state, dataset);
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

  d3.select("#result").html(`
    <h3>Closest Match: ${bestMatch.user}</h3>
    <p><strong>Total Sleep Time:</strong> ${bestMatch["Total Sleep Time"]} minutes</p>
    <p><strong>Sleep Fragmentation Index:</strong> ${bestMatch["Sleep Fragmentation Index"]}</p>
  `);
}

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
