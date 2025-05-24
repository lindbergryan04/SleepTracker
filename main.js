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
  // response.element: the DOM element that triggered the event
  // response.index: the index of the step
  // response.direction: 'up' or 'down'
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


