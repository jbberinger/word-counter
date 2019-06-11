const URL = 'how_to.txt';
const padding = 3;
let chartElement;

const store = {
  words: [],
  wordCount: [],
  dataSet: [],
  svg: undefined,
  barChart: undefined,
};

// Returns text from url
const fetchText = async (url) => {
  const response = await fetch(url);
  return response.text();
};

// Returns an array of counted word objects in descending order
const countWords = (text) => {
  const regex = /[^a-zA-Z'’-]/g;

  // Filters out non alphabetic characters and apostrophies
  const words = text.toLowerCase().replace(regex, ' ').split(' ').filter(w => w);
  store.words = words;
  const wordCount = [];

  // Iterates word array.
  for (let i = 0; i < words.length; i += 1) {

    let foundMatch = false;

    // Finds word in wordCount and increments counter.
    for (let j = 0; j < wordCount.length; j += 1) {
      if (words[i] === wordCount[j][0]) {
        wordCount[j][1] += 1;
        foundMatch = true;
        break;
      }
    }

    // Adds word to wordCount if not found
    if (!foundMatch) {
      wordCount.push([words[i], 1]);
    } else {
      foundMatch = false;
    }
  }
  return wordCount.sort((a, b) => b[1] - a[1]);
};

const redrawBarChart = () => {
  const width = chartElement.clientWidth - 2 * padding;
  const height = chartElement.clientHeight - 2 * padding;
  const maxY = d3.max(store.dataSet, d => d[1]);

  // Paints bar chart to svg
  store.barChart = store.svg.selectAll('rect').data(store.dataSet);

  // removes bars based on new data
  store.barChart.exit().remove();

  // appends new bars
  store.barChart.enter().append('rect');

  const yScale = d3.scaleLinear()
    .domain([0, maxY])
    .range([height - padding, padding]);

  const xScale = d3.scaleBand()
    .domain(store.dataSet.map(d => d[0]))
    .range([padding, width - padding])
    .paddingInner(0.1);

  // Updates svg canvas
  store.svg.attr('id', 'svg')
    .attr('width', width)
    .attr('height', height);

  // Updates barchart
  store.barChart.attr('transform', `translate(${padding},${padding})`)
    .attr('class', 'rect')
    .attr('fill', 'black')
    .attr('width', xScale.bandwidth())
    .attr('height', d => height - yScale(d[1]) - padding)
    .attr('x', d => xScale(d[0]))
    .attr('y', d => yScale(d[1]))
    // eslint-disable-next-line func-names
    .on('mouseover', function (d, i) {
      d3.select(this)
        .attr('fill', '#7b435b')
    })
    // eslint-disable-next-line func-names
    .on('mouseout', function (d, i) {
      d3.select(this)
        .attr('fill', 'black')
    });
};

const updateStats = () => {
  const { words, wordCount } = store;
  d3.select('#most-common-title').text('Most Common Word');
  d3.select('#most-common').html(`"${wordCount[0][0]}"`);

  d3.select('#unique-title').text('Unique Words');
  d3.select('#unique').html(wordCount.length);

  d3.select('#total-title').text('Total Words');
  d3.select('#total').html(words.length);

  d3.select('#longest-title').text('Longest Word');
  d3.select('#longest').html(`"${words.reduce((a, b) => (a.length < b.length ? b : a), '')}"`);
};

// Reduces array to top 30 used words
const trimData = data => data.slice(0, 50);

// Wraps timer around function to ensure it is only called
// after there is a specified delay between calls
const debounce = (fn, delay) => {
  let timer;

  return function () {
    let context = this;
    let args = arguments;
    // clears timer on each call
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  }

}

// Handles textarea input
const handleInput = async () => {
  const { value } = document.getElementById('textarea');
  const wordCount = countWords(value);
  store.wordCount = wordCount;
  store.dataSet = trimData(wordCount);
  updateStats();
  redrawBarChart();
};

const initialize = async (url) => {
  const text = await fetchText(url);
  const wordCount = countWords(text);
  d3.select('textarea').text(text);

  store.wordCount = wordCount;
  store.dataSet = trimData(wordCount);
  chartElement = document.getElementById('chart');

  // Acts as an svg canvas
  store.svg = d3.select('#chart').append('svg');
  store.barChart = store.svg.selectAll('rect')
    .data(store.dataSet)
    .enter()
    .append('rect');

  updateStats(wordCount);
  redrawBarChart();

  window.addEventListener('resize', debounce(redrawBarChart, 50));
  document.getElementById('textarea').addEventListener('keyup', debounce(handleInput, 300));
};

// calls functions for development purposes
initialize(URL).catch(error => {
  console.log('error!');
  console.error(error);
});