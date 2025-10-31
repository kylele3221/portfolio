console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// const navLinks = $$("nav a");
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );
// currentLink?.classList.add("current");

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "/" : "/portfolio/";
const normalize = (p) => p.replace(/\/$/, "/index.html");

let pages = [
  { url: "",           title: "Home" },
  { url: "projects/",  title: "Projects" },
  { url: "resume/",    title: "Resume" },
  { url: "contact/",   title: "Contact" },
  { url: "https://github.com/kylele3221", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  url = !url.startsWith("http") ? BASE_PATH + url : url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && normalize(a.pathname) === normalize(location.pathname)) {
    a.classList.add("current");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  "beforeend",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector(".color-scheme select");

if ("colorScheme" in localStorage) {
  select.value = localStorage.colorScheme;
}

function applyScheme(value) {
  if (value === "light" || value === "dark") {
    document.documentElement.setAttribute("data-color-scheme", value);
  } else {
    document.documentElement.removeAttribute("data-color-scheme");
  }
}

applyScheme(select.value);

select.addEventListener("input", (e) => {
  localStorage.colorScheme = e.target.value;
  applyScheme(e.target.value);
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, el, h = 'h2') {
  if (!el) return;
  el.innerHTML = '';
  (projects || []).forEach(p => {
    const a = document.createElement('article');
    a.innerHTML = `
      <${h}>${p.title}</${h}>
      <img src="${p.image}" alt="">
      <div>
        <p>${p.description || ''}</p>
        ${p.year ? `<p class="project-year">${p.year}</p>` : ''}
      </div>
    `;
    el.appendChild(a);
  });
}


export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
