/* *
*TODO:
* - Clear everything when textarea is empty
* - Look into word highlighting on chart mouseover
* - Add option to include numbers
* */

const DEFAULT_OPTIONS = {
  isCaseSensitive: true,
  minWordLength: 1,
  chartWords: 50,
};

const store = {
  URL: 'how_to.txt',
  chartPadding: 3,
  words: [],
  wordCount: [],
  dataSet: [],
  options: DEFAULT_OPTIONS,
  svg: undefined,
  barChart: undefined,
  chartElement: undefined,
  tooltip: undefined,
  tooltipLine: undefined,
};

// Returns text from url
const fetchText = async (url) => {
  const response = await fetch(url);
  return response.text();
};

// Filters out non-alphabetic characters and apostrophies, and returns words of minimum length
const parseWords = (txt) => {
  const text = store.options.isCaseSensitive ? txt.toLowerCase() : txt;
  const regex = /[^a-zA-Z'’-]/g;
  return text.replace(regex, ' ').split(' ').filter(w => w.length >= store.options.minWordLength);
};

// Returns an array of counted word objects in descending order
const countWords = (text) => {
  const words = parseWords(text);
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

const updateBarChart = () => {
  const width = store.chartElement.clientWidth - 2 * store.chartPadding;
  const height = store.chartElement.clientHeight - 2 * store.chartPadding;
  const maxY = d3.max(store.dataSet, d => d[1]);

  // Paints bar chart to svg
  store.barChart = store.svg.selectAll('rect').data(store.dataSet);

  // removes bars based on new data
  store.barChart.exit().remove();

  // merges changes
  store.barChart.enter().append('rect');

  store.barChart = store.svg.selectAll('rect').data(store.dataSet);

  // appends new bars

  const yScale = d3.scaleLinear()
    .domain([0, maxY])
    .range([height - store.chartPadding, store.chartPadding]);

  const xScale = d3.scaleBand()
    .domain(store.dataSet.map(d => d[0]))
    .range([store.chartPadding, width - store.chartPadding])
    .paddingInner(0.1);

  // Updates svg canvas
  store.svg.attr('id', 'svg')
    .attr('width', width)
    .attr('height', height);

  // Updates barchart
  store.barChart
    .attr('transform', `translate(${store.chartPadding},${store.chartPadding})`)
    .attr('class', 'rect')
    .attr('fill', 'black')
    .attr('width', xScale.bandwidth())
    .attr('height', d => height - yScale(d[1]) - store.chartPadding)
    .attr('x', d => xScale(d[0]))
    .attr('y', d => yScale(d[1]))
    .attr('border-radius', 3)
    .on('mouseover', function mouseover(d) {
      d3.select(this)
        .attr('fill', '#7b435b');
      const xPos = d3.event.pageX;
      const yPos = d3.event.pageY;
      const angle = Math.PI / 4;
      const lineWidth = 50;
      store.tooltip
        .html(`${d[0]} x ${d[1]}`)
        .style('left', `${xPos + Math.asin(angle) * lineWidth}px`)
        .style('top', (yPos - Math.acos(angle) * lineWidth * 2 - 20))
        .style('opacity', '1');
      store.tooltipLine
        .style('width', lineWidth)
        .style('transform', `rotate(-${angle}rad)`)
        .style('left', xPos)
        .style('top', (yPos - Math.acos(angle) * lineWidth / 2))
        .style('opacity', '1');
    })
    .on('mouseout', function mouseout() {
      d3.select(this)
        .attr('fill', 'black');
      store.tooltip
        .style('opacity', 0);
      store.tooltipLine
        .style('opacity', 0);
    });
};

const updateStats = () => {
  const { words, wordCount } = store;
  const stats = {
    totalChar: {
      title: 'Total Characters:',
      stat: store.text.length,
    },
    total: {
      title: 'Total Words:',
      stat: words.length,
    },
    unique: {
      title: 'Unique Words:',
      stat: wordCount.length,
    },
    mostCommon: {
      title: 'Most Common Word:',
      stat: `"${store.text.length === 0 ? '' : wordCount[0][0]}"`,
    },
    longest: {
      title: 'Longest Word:',
      stat: `"${words.reduce((a, b) => (a.length < b.length ? b : a), '')}"`,
    },
  };
  const openTags = '<div class="stat-content"><span class="stat-title">';
  d3.select('#stats').html(Object.keys(stats).map(s => `${openTags}${stats[s].title}</span> ${stats[s].stat}</div>`).join(''));
};

// Displays a table with word, count, and percentage
const updateWordTable = () => {
  const { words, wordCount } = store;
  const total = words.length;
  const titles = '<tr><th>word</th><th>count</th><th>dist.</th></tr>';

  d3.select('#word-table-header').html(titles);
  d3.select('#word-table').html(wordCount.map((w) => {
    const word = w[0];
    const count = w[1];
    const percentage = (count / total * 100).toFixed(2);
    const wrapTR = inner => `<tr class="word-list-row">${inner}</tr>`;
    const wrapTD = inner => `<td class="word-list-word">${inner}</td>`;
    return wrapTR(`${wrapTD(word)}${wrapTD(count)}${wrapTD(`${percentage}%`)}`);
  }).join(''));
};

// Reduces array to top 50 used words
const trimData = data => data.slice(0, store.options.chartWords);

// Wraps timer around function to ensure it is only called
// after there is a specified delay between calls
const debounce = (fn, delay) => {
  let timer;
  return function db(...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
};

const updateAll = () => {
  store.wordCount = countWords(store.text);
  store.dataSet = trimData(store.wordCount);
  updateStats();
  updateWordTable();
  updateBarChart();
};

const handleTextInput = () => {
  const { value } = document.querySelector('#textarea');
  const wordCount = countWords(value);
  store.text = value;
  store.wordCount = wordCount;
  updateAll();
};

const handleOptions = (e) => {
  const ops = store.options;
  switch (e.target.id) {
    case 'option-case-sensitive':
      ops.isCaseSensitive = e.target.checked;
      break;
    case 'option-length-down':
      ops.minWordLength = ops.minWordLength > 1 ? ops.minWordLength - 1 : ops.minWordLength;
      document.querySelector('#option-length-text').value = ops.minWordLength;
      break;
    case 'option-length-up':
      ops.minWordLength += 1;
      document.querySelector('#option-length-text').value = ops.minWordLength;
      break;
    case 'option-length-text':
      ops.chartWords = document.querySelector('#option-length-text').value;
      break;
    case 'option-chart-down':
      ops.chartWords = ops.chartWords > 1 ? ops.chartWords - 1 : ops.chartWords;
      document.querySelector('#option-chart-text').value = ops.chartWords;
      break;
    case 'option-chart-up':
      ops.chartWords += 1;
      document.querySelector('#option-chart-text').value = ops.chartWords;
      break;
    case 'option-chart-text':
      ops.chartWords = document.querySelector('#option-chart-text').value;
      break;
    default:
      break;
  }
  updateAll();
};

const initialize = async (url) => {
  const text = await fetchText(url);
  store.text = text;
  const wordCount = countWords(text);
  d3.select('textarea').text(text);

  store.wordCount = wordCount;
  store.dataSet = trimData(wordCount);
  store.chartElement = document.querySelector('#chart');

  // Acts as an svg canvas
  store.svg = d3.select('#chart').append('svg');
  store.barChart = store.svg.selectAll('rect')
    .data(store.dataSet)
    .enter()
    .append('rect');
  store.tooltip = d3.select('body')
    .append('div')
    .attr('id', 'tooltip');
  store.tooltipLine = d3.select('body')
    .append('div')
    .attr('id', 'tooltip-line');

  updateAll();
  window.addEventListener('resize', debounce(updateBarChart, 50));
  document.querySelector('#textarea').addEventListener('keyup', debounce(handleTextInput, 100));
  document.querySelector('#options').addEventListener('submit', e => e.preventDefault());

  const options = Array.from(document.querySelector('#options').querySelectorAll('button, input'));
  options.forEach((element) => {
    const op = element;
    if (op.type === 'text') {
      op.onkeyup = handleOptions;
    } else if (op.type === 'submit') {
      op.onclick = handleOptions;
    } else {
      op.onchange = handleOptions;
    }
  });

  document.querySelector('#option-length-text').value = store.options.minWordLength;
  document.querySelector('#option-chart-text').value = store.options.chartWords;
};

initialize(store.URL);
