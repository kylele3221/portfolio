import { fetchJSON } from '../global.js';

const data = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
console.log('projects loaded:', data, container);
