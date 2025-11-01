import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let query = '';

const projects = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(projects, container, 'h2');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${projects.length})`;

const svg = d3.select('#projects-pie-plot');
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

const rolledData = d3.rollups(
  projects,
  v => v.length,
  d => d.year
);

const data = rolledData.map(([year, count]) => ({ value: count, label: year }));
const sliceGenerator = d3.pie().value(d => d.value);
const arcData = sliceGenerator(data);
const arcs = arcData.map(d => arcGenerator(d));
const colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, idx) => {
  svg.append('path').attr('d', arc).attr('fill', colors(idx));
});

const legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', e => {
  query = e.target.value.toLowerCase();
  let filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(query)
  );
  container.innerHTML = '';
  renderProjects(filteredProjects, container, 'h2');
});

