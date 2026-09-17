#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const token = process.env.GITHUB_TOKEN;
const login = process.env.GITHUB_USER_NAME;

if (!token) throw new Error("GITHUB_TOKEN is required.");
if (!login) throw new Error("GITHUB_USER_NAME is required.");

const API = "https://api.github.com/graphql";
const repositoryRoot = path.resolve(__dirname, "..");
const outputDirectoryName = process.env.PROFILE_OUTPUT_DIR || "profile";
if (path.isAbsolute(outputDirectoryName)) {
  throw new Error("PROFILE_OUTPUT_DIR must be a repository-relative path.");
}
const outputDir = path.resolve(repositoryRoot, outputDirectoryName);
if (outputDir === repositoryRoot || !outputDir.startsWith(`${repositoryRoot}${path.sep}`)) {
  throw new Error("PROFILE_OUTPUT_DIR must resolve inside the repository.");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

async function graphql(query, variables) {
  const response = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "naufalspurnomo-profile-telemetry",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${payload.errors.map((error) => error.message).join("; ")}`);
  }
  if (!payload.data) throw new Error("GitHub GraphQL response did not contain data.");
  return payload.data;
}

async function loadTelemetry() {
  const query = `
    query ProfileTelemetry($login: String!, $cursor: String) {
      user(login: $login) {
        login
        name
        followers { totalCount }
        repositories(
          first: 100
          after: $cursor
          ownerAffiliations: OWNER
          privacy: PUBLIC
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          pageInfo { hasNextPage endCursor }
          nodes {
            isArchived
            isFork
            stargazerCount
            languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
              edges { size node { name color } }
            }
          }
        }
        contributionsCollection {
          contributionCalendar { totalContributions }
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          restrictedContributionsCount
        }
      }
    }
  `;

  let cursor = null;
  let user = null;
  const repositories = [];

  do {
    const data = await graphql(query, { login, cursor });
    if (!data.user) throw new Error(`GitHub user not found: ${login}`);
    user ||= data.user;
    repositories.push(...data.user.repositories.nodes);
    const pageInfo = data.user.repositories.pageInfo;
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  const eligible = repositories.filter((repository) => !repository.isFork && !repository.isArchived);
  const languages = new Map();
  for (const repository of eligible) {
    for (const edge of repository.languages.edges) {
      const current = languages.get(edge.node.name) || { bytes: 0, color: edge.node.color };
      current.bytes += edge.size;
      current.color ||= edge.node.color;
      languages.set(edge.node.name, current);
    }
  }

  const rankedLanguages = [...languages.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.bytes - a.bytes);
  if (!rankedLanguages.length) {
    throw new Error(`No language data found in non-fork, non-archived public repositories for ${login}.`);
  }

  return {
    login: user.login,
    name: user.name || user.login,
    followers: user.followers.totalCount,
    repositories: eligible.length,
    stars: eligible.reduce((sum, repository) => sum + repository.stargazerCount, 0),
    contributions: user.contributionsCollection.contributionCalendar.totalContributions,
    commits: user.contributionsCollection.totalCommitContributions,
    pullRequests: user.contributionsCollection.totalPullRequestContributions,
    issues: user.contributionsCollection.totalIssueContributions,
    privateContributions: user.contributionsCollection.restrictedContributionsCount,
    languages: rankedLanguages,
  };
}

function cardShell(width, height, title, subtitle, body, ariaLabel) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111f"/><stop offset="1" stop-color="#020617"/></linearGradient>
    <linearGradient id="signal" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0e7490"/><stop offset="1" stop-color="#7dd3fc"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" fill="url(#panel)" stroke="#164e63" stroke-width="2"/>
  <path d="M18 1h96l12 12h${width - 144}" fill="none" stroke="#38bdf8" opacity=".7"/>
  <path d="M${width - 72} ${height - 1}h54v-20" fill="none" stroke="#0e7490"/>
  <circle cx="${width - 26}" cy="27" r="4" fill="#7dd3fc" filter="url(#glow)"/>
  <text x="24" y="35" fill="#7dd3fc" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="16" font-weight="700">${escapeXml(title)}</text>
  <text x="24" y="55" fill="#64748b" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="10">${escapeXml(subtitle)}</text>
  ${body}
</svg>\n`;
}

function statsSvg(data) {
  const items = [
    ["PUBLIC REPOS", data.repositories], ["TOTAL STARS", data.stars],
    ["FOLLOWERS", data.followers], ["YEAR SIGNAL", data.contributions],
    ["COMMITS", data.commits], ["PULL REQUESTS", data.pullRequests],
  ];
  const cells = items.map(([label, value], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 24 + column * 157;
    const y = 91 + row * 67;
    return `<g transform="translate(${x} ${y})"><text fill="#e0f2fe" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="24" font-weight="700">${formatNumber(value)}</text><text y="20" fill="#64748b" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="9">${label}</text><rect y="29" width="132" height="2" fill="#0f2942"/><rect y="29" width="42" height="2" fill="#38bdf8"/></g>`;
  }).join("");
  const privateNote = data.privateContributions
    ? ` · ${formatNumber(data.privateContributions)} private contributions included`
    : "";
  return cardShell(495, 225, "COMBAT TELEMETRY", `@${data.login} · current contribution year${privateNote}`, cells, `${data.login} GitHub statistics`);
}

function languagesSvg(data) {
  const shown = data.languages.slice(0, 5);
  const total = data.languages.reduce((sum, language) => sum + language.bytes, 0);
  let offset = 0;
  const segments = shown.map((language, index) => {
    const percentage = language.bytes / total * 100;
    const width = 302 * percentage / 100;
    const rect = `<rect x="${offset}" width="${width}" height="10" fill="${escapeXml(language.color || ["#38bdf8", "#7dd3fc", "#0e7490", "#bae6fd", "#64748b"][index])}"/>`;
    offset += width;
    return rect;
  }).join("");
  const rows = shown.map((language, index) => {
    const percentage = language.bytes / total * 100;
    const y = 108 + index * 22;
    return `<circle cx="27" cy="${y - 4}" r="4" fill="${escapeXml(language.color || "#38bdf8")}"/><text x="39" y="${y}" fill="#cbd5e1" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="11">${escapeXml(language.name)}</text><text x="326" y="${y}" text-anchor="end" fill="#7dd3fc" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="11">${percentage.toFixed(1)}%</text>`;
  }).join("");
  const body = `<g transform="translate(24 75)"><rect width="302" height="10" rx="5" fill="#0f2942"/>${segments}</g>${rows}`;
  return cardShell(350, 225, "LANGUAGE LOADOUT", `${data.repositories} owned · non-fork · active repositories`, body, `${data.login} most-used repository languages`);
}

async function main() {
  const telemetry = await loadTelemetry();
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, "stats.svg"), statsSvg(telemetry), "utf8"),
    fs.writeFile(path.join(outputDir, "top-langs.svg"), languagesSvg(telemetry), "utf8"),
  ]);
  process.stdout.write(`${JSON.stringify({
    login: telemetry.login,
    repositories: telemetry.repositories,
    stars: telemetry.stars,
    followers: telemetry.followers,
    contributions: telemetry.contributions,
    commits: telemetry.commits,
    pullRequests: telemetry.pullRequests,
    issues: telemetry.issues,
    topLanguages: telemetry.languages.slice(0, 5).map(({ name, bytes }) => ({ name, bytes })),
  })}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
