import { fetchJSON, renderProjects } from './global.js';

const all = await fetchJSON('./lib/projects.json');
const latest = all.slice(-3);

const homeContainer = document.querySelector('.projects');
if (homeContainer) renderProjects(latest, homeContainer, 'h3');
