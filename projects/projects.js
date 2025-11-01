import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const data = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(data, container, 'h2');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${data.length})`;

const svg = d3.select('#projects-pie-plot');
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

const pieData = [
  { value: 1, label: 'apples' },
  { value: 2, label: 'oranges' },
  { value: 3, label: 'mangos' },
  { value: 4, label: 'pears' },
  { value: 5, label: 'limes' },
  { value: 5, label: 'cherries' }
];

const sliceGenerator = d3.pie().value(d => d.value);
const arcData = sliceGenerator(pieData);
const arcs = arcData.map(d => arcGenerator(d));
const colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, idx) => {
  svg.append('path').attr('d', arc).attr('fill', colors(idx));
});

const legend = d3.select('.legend');
pieData.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});
