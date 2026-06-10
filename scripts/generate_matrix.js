const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_USER_NAME || 'Naufalspurnomo';

if (!GITHUB_TOKEN) {
    console.error("Missing GITHUB_TOKEN environment variable");
    process.exit(1);
}

async function fetchContributions() {
    const query = `
    query($username: String!) {
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                            color
                        }
                    }
                }
            }
        }
    }`;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { username: USERNAME } })
    });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.user.contributionsCollection.contributionCalendar.weeks;
}

function generateSVG(weeks) {
    const boxSize = 10;
    const gap = 4;
    const width = weeks.length * (boxSize + gap) + 40;
    const height = 7 * (boxSize + gap) + 40;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>
        .box { rx: 2; ry: 2; stroke: rgba(255,255,255,0.05); stroke-width: 1px; }
        .bg { fill: transparent; }
        .text { font-family: monospace; font-size: 10px; fill: #7dd3fc; }
    </style>
    <rect width="${width}" height="${height}" class="bg" />
    <g transform="translate(20, 20)">
    `;

    // Map standard github hex colors to Metatron themed colors
    // We check if the box is empty vs filled
    let x = 0;
    let pathPoints = [];
    
    weeks.forEach((week, wIndex) => {
        let y = 0;
        let highestDay = 0;
        let maxCount = -1;

        week.contributionDays.forEach((day, dIndex) => {
            let fill = '#0f172a'; // Empty state
            if (day.contributionCount > 0) {
                // Determine shade based on count relative to a typical max
                if (day.contributionCount > 10) fill = '#e0f2fe';
                else if (day.contributionCount > 5) fill = '#38bdf8';
                else if (day.contributionCount > 2) fill = '#0284c7';
                else fill = '#0e7490';
            }

            svg += `<rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" fill="${fill}" class="box">
                <title>${day.contributionCount} contributions on ${day.date}</title>
            </rect>\n`;
            
            if (day.contributionCount > maxCount) {
                maxCount = day.contributionCount;
                highestDay = y;
            }
            
            y += boxSize + gap;
        });

        // Add to our path if it was an active week
        if (maxCount > 0 || wIndex % 4 === 0) {
            pathPoints.push(`${x},${highestDay}`);
        }

        x += boxSize + gap;
    });

    if (pathPoints.length === 0) pathPoints = ["0,0", `${width},0`];

    // Ensure it goes off screen at the end
    pathPoints.push(`${width + 40}, ${height/2}`);

    svg += `</g>\n`;
    
    // Add the animated character
    const imgPath = path.join(__dirname, '..', 'assets', 'chibi-origami.png');
    let imgHref = '';
    if (fs.existsSync(imgPath)) {
        const imgBase64 = fs.readFileSync(imgPath).toString('base64');
        imgHref = `data:image/png;base64,${imgBase64}`;
    }

    svg += `<g transform="translate(20, 20)">
        <image href="${imgHref}" width="48" height="48" x="-24" y="-36" />
        <animateMotion 
            path="M -40 ${height/2} L ${pathPoints.join(' L ')}" 
            dur="15s" 
            repeatCount="indefinite" 
            calcMode="linear"
        />
    </g>`;

    svg += `</svg>`;
    return svg;
}

async function main() {
    try {
        console.log("Fetching contributions for " + USERNAME);
        const weeks = await fetchContributions();
        console.log("Generating SVG...");
        const svg = generateSVG(weeks);
        
        const outDir = path.join(__dirname, '..', 'dist');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(outDir, 'github-origami-matrix.svg'), svg);
        console.log("Successfully generated dist/github-origami-matrix.svg");
    } catch (err) {
        console.error("Error generating matrix:", err);
        process.exit(1);
    }
}

main();
