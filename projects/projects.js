import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const data = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(data, container, 'h2');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${data.length})`;

const svg = d3.select('#projects-pie-plot');

const arc = d3.arc()
  .innerRadius(0)
  .outerRadius(50)({
    startAngle: 0,
    endAngle: 2 * Math.PI
  });

svg.append('path')
  .attr('d', arc)
  .attr('fill', 'red');
