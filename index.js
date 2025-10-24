import { fetchJSON, renderProjects } from './global.js';

const all = await fetchJSON('./lib/projects.json');
const latest = all.slice(-3);

const homeContainer = document.querySelector('.projects');
if (homeContainer) renderProjects(latest, homeContainer, 'h3');

import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const all = await fetchJSON('./lib/projects.json');
const latest = all.slice(-3);
const homeContainer = document.querySelector('.projects');
if (homeContainer) renderProjects(latest, homeContainer, 'h3');

const profileStats = document.querySelector('#profile-stats');
if (profileStats) {
  const d = await fetchGitHubData('kylele3221');
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${d.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${d.public_gists}</dd>
      <dt>Followers:</dt><dd>${d.followers}</dd>
      <dt>Following:</dt><dd>${d.following}</dd>
    </dl>
  `;
}
