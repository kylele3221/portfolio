import { fetchJSON, renderProjects } from '../global.js';

const data = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(data, container, 'h2');

const title = document.querySelector('.projects-title');
if (title) title.textContent = `Projects (${data.length})`;
