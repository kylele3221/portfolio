import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

let allData;
let allCommits;
let filteredCommits;

let commitProgress = 100;
let timeScale;
let commitMaxTime;

const colors = d3.scaleOrdinal(d3.schemeTableau10);

/* ======================
   DATA LOADING
====================== */

async function loadData() {
  const data = await d3.csv('loc.csv', row => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  const commits = d3
    .groups(data, d => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: 'https://github.com/kylele3221/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
      });
      return ret;
    });

  // ensure commits are in chronological order for scrollytelling
  commits.sort((a, b) => a.datetime - b.datetime);

  return commits;
}

/* ======================
   SUMMARY STATS
====================== */

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const numFiles = d3.group(data, d => d.file).size;
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  const maxDepth = d3.max(data, d => d.depth);
  dl.append('dt').text('Max depth');
  dl.append('dd').text(maxDepth);

  const avgLineLength = d3.mean(data, d => d.length) || 0;
  dl.append('dt').text('Avg line length');
  dl.append('dd').text(avgLineLength.toFixed(1));

  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const avgFileLength = d3.mean(fileLengths, d => d[1]) || 0;
  dl.append('dt').text('Avg file length');
  dl.append('dd').text(avgFileLength.toFixed(1));
}

/* ======================
   TOOLTIP HELPERS
====================== */

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit) return;

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent =
    commit.datetime?.toLocaleString('en', { dateStyle: 'full' }) ?? '';

  time.textContent =
    commit.datetime?.toLocaleString('en', { timeStyle: 'short' }) ?? '';

  author.textContent = commit.author ?? '';
  lines.textContent = commit.totalLines ?? '';
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

/* ======================
   BRUSH + SELECTION
====================== */

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter(d => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter(d => isCommitSelected(selection, d))
    : [];

  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap(d => d.lines);

  const breakdown = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function brushed(event) {
  const selection = event.selection;

  d3
    .selectAll('.dots circle')
    .classed('selected', d => isCommitSelected(selection, d));

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function createBrushSelector(svg, usableArea, brushedHandler) {
  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on('start brush end', brushedHandler);

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

/* ======================
   SCATTER PLOT
====================== */

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)
  );

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id) // key by commit id
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', event => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  createBrushSelector(svg, usableArea, brushed);
}

function updateScatterPlot(data, commits) {
  filteredCommits = commits;

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', event => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

/* ======================
   STEP 2 – FILE UNIT VIZ
====================== */

function updateFileDisplay(filtered) {
  const lines = filtered.flatMap(d => d.lines);

  const files = d3
    .groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter =>
      enter.append('div').call(div => {
        div.append('dt');
        div.append('dd');
      })
    );

  filesContainer
    .select('dt')
    .html(d => {
      const count = d.lines.length;
      return `<code>${d.name}</code><small>${count} lines</small>`;
    });

  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('--color', d => colors(d.type));
}

/* ======================
   SLIDER SETUP
====================== */

function setupSlider() {
  timeScale = d3
    .scaleTime()
    .domain([
      d3.min(allCommits, d => d.datetime),
      d3.max(allCommits, d => d.datetime),
    ])
    .range([0, 100]);

  commitMaxTime = timeScale.invert(commitProgress);

  const slider = document.querySelector('#commit-progress');
  const timeEl = document.querySelector('#commit-time');

  function onTimeSliderChange() {
    commitProgress = +slider.value;
    commitMaxTime = timeScale.invert(commitProgress);

    timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const newFiltered = allCommits.filter(d => d.datetime <= commitMaxTime);

    updateScatterPlot(allData, newFiltered);
    updateFileDisplay(newFiltered);
  }

  if (slider) {
    slider.addEventListener('input', onTimeSliderChange);
    onTimeSliderChange(); // initialize
  }
}

/* ======================
   STEP 3.2 – STORY TEXT
====================== */

function setupStoryText() {
  d3
    .select('#scatter-story')
    .selectAll('.step')
    .data(allCommits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      <p>
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made <a href="${d.url}" target="_blank" rel="noopener noreferrer">
          ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
        </a>.
        I edited ${d.totalLines} lines across ${
          d3.rollups(
            d.lines,
            D => D.length,
            l => l.file
          ).length
        } files.
        Then I looked over all I had made, and I saw that it was very good.
      </p>
    `);
}

/* ======================
   STEP 3.3 – SCROLLAMA
====================== */

function setupScrollama() {
  function onStepEnter(response) {
    const commit = response.element.__data__;
    if (!commit) return;

    // update commitMaxTime based on this commit
    commitMaxTime = commit.datetime;
    commitProgress = timeScale(commitMaxTime);

    const slider = document.querySelector('#commit-progress');
    const timeEl = document.querySelector('#commit-time');

    if (slider) {
      slider.value = commitProgress;
    }

    if (timeEl) {
      timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    }

    const newFiltered = allCommits.filter(d => d.datetime <= commitMaxTime);
    updateScatterPlot(allData, newFiltered);
    updateFileDisplay(newFiltered);
  }

  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);
}

/* ======================
   INIT
====================== */

async function init() {
  allData = await loadData();
  allCommits = processCommits(allData);
  filteredCommits = allCommits;

  renderCommitInfo(allData, allCommits);
  renderScatterPlot(allData, allCommits);
  updateFileDisplay(filteredCommits);

  setupSlider();
  setupStoryText();
  setupScrollama();
}

init();
