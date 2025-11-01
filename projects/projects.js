import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm
';
import { fetchJSON, renderProjects } from '../global.js';

const data = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(data, container, 'h2');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${data.length})`;

// D3 PIE STUFF STARTS HERE
const svg = d3.select('#projects-pie-plot');

// arc generator: radius 50, full pie
const arcGenerator = d3.arc()
.innerRadius(0)
.outerRadius(50);

// our pretend data (1 and 2 -> 1/3 and 2/3)
const pieData = [1, 2];

// d3.pie will give us startAngle / endAngle for each slice
const sliceGenerator = d3.pie();
const arcData = sliceGenerator(pieData);

// turn those angle objects into actual path strings
const arcs = arcData.map(d => arcGenerator(d));

// colors for the 2 slices
const colors = ['gold', 'purple'];

// draw each slice
arcs.forEach((arc, idx) => {
svg.append('path')
.attr('d', arc)
.attr('fill', colors[idx]);
});
