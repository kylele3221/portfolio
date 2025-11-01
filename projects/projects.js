import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let query = '';
let selectedIndex = -1;
let currentData = [];

const projects = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(projects, container, 'h2');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${projects.length})`;

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

function applyFilters(baseProjects) {
  let filtered = baseProjects.filter(p =>
    Object.values(p).join('\n').toLowerCase().includes(query)
  );
  if (selectedIndex !== -1 && currentData[selectedIndex]) {
    const year = currentData[selectedIndex].label;
    filtered = filtered.filter(p => p.year === year);
  }
  return filtered;
}

function renderPieChart(projectsGiven) {
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  const data = rolledData.map(([year, count]) => ({ value: count, label: year }));
  currentData = data;
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);
  const arcs = arcData.map(d => arcGenerator(d));
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((arc, idx) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(idx))
      .attr('class', selectedIndex === idx ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        const filtered = applyFilters(projects);
        container.innerHTML = '';
        renderProjects(filtered, container, 'h2');
        renderPieChart(filtered);
      });
  });

  data.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', selectedIndex === idx ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        const filtered = applyFilters(projects);
        container.innerHTML = '';
        renderProjects(filtered, container, 'h2');
        renderPieChart(filtered);
      });
  });
}

renderPieChart(projects);

const searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', e => {
  query = e.target.value.toLowerCase();
  const filtered = applyFilters(projects);
  container.innerHTML = '';
  renderProjects(filtered, container, 'h2');
  renderPieChart(filtered);
});
