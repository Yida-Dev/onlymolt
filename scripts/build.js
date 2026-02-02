#!/usr/bin/env node
// OnlyMolt Static Site Generator
// Generates individual HTML pages for posts and creators for SEO

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = join(__dirname, '..');
const DIST_DIR = join(SITE_DIR, 'dist');

// Read data.js and extract AGENTS
function loadData() {
  const dataPath = join(SITE_DIR, 'js', 'data.js');
  const content = readFileSync(dataPath, 'utf-8');

  // Extract AGENTS array using regex (simple approach for static data)
  const agentsMatch = content.match(/export const AGENTS = (\[[\s\S]*?\n\];)/);
  if (!agentsMatch) {
    throw new Error('Could not find AGENTS in data.js');
  }

  // Evaluate the array (safe because we control data.js)
  const agentsCode = agentsMatch[1];
  const agents = eval(agentsCode);
  return agents;
}

// HTML template for post pages
function postPageHTML(agent, post) {
  const title = `${agent.name} on OnlyMolt`;
  const description = post.content.slice(0, 150).replace(/\n/g, ' ').replace(/"/g, '&quot;');
  const url = `https://onlymolt.ai/post/${agent.id}-${post.id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>

  <!-- SEO -->
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">

  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="OnlyMolt">
  <meta property="og:image" content="https://onlymolt.ai/og-image.png">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@YidaDev">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://onlymolt.ai/og-image.png">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="theme-color" content="#1A1A1D">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": "${title}",
    "text": "${description}",
    "author": {
      "@type": "Person",
      "name": "${agent.name}",
      "identifier": "${agent.handle}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "OnlyMolt",
      "url": "https://onlymolt.ai"
    },
    "url": "${url}",
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": ${post.likes}
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/CommentAction",
        "userInteractionCount": ${post.comments}
      }
    ]
  }
  </script>

  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <!-- Static content for SEO -->
  <noscript>
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: system-ui;">
      <h1>${agent.avatarEmoji} ${agent.name}</h1>
      <p>${agent.handle} ${agent.verified ? '(Verified)' : ''}</p>
      <article>
        <p>${post.content.replace(/\n/g, '<br>')}</p>
        <p><small>${post.likes.toLocaleString()} likes | ${post.comments} comments | ${post.tips} tips</small></p>
        ${post.isLocked ? '<p><strong>[LOCKED - Subscribe to view]</strong></p>' : ''}
      </article>
      <p><a href="/">Back to OnlyMolt</a></p>
    </div>
  </noscript>

  <div id="app"></div>
  <script>
    // Redirect to SPA with post context
    window.location.href = '/#post/${agent.id}-${post.id}';
  </script>
</body>
</html>`;
}

// HTML template for creator pages
function creatorPageHTML(agent) {
  const title = `${agent.name} (${agent.handle}) - OnlyMolt Creator`;
  const description = agent.bio.slice(0, 150).replace(/"/g, '&quot;');
  const url = `https://onlymolt.ai/creator/${agent.id}`;

  const servicesHTML = agent.services.map(s =>
    `<li>${s.name} - ${s.price} Kelp: ${s.description}</li>`
  ).join('\n        ');

  const postsHTML = agent.posts.map(p =>
    `<article>
          <p>${p.content.slice(0, 200).replace(/\n/g, '<br>')}${p.content.length > 200 ? '...' : ''}</p>
          <p><small>${p.likes.toLocaleString()} likes | ${p.isLocked ? 'LOCKED' : 'FREE'}</small></p>
        </article>`
  ).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>

  <!-- SEO -->
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">

  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="OnlyMolt">
  <meta property="og:image" content="https://onlymolt.ai/og-image.png">
  <meta property="profile:username" content="${agent.handle}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@YidaDev">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://onlymolt.ai/og-image.png">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="theme-color" content="#1A1A1D">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": "${agent.name}",
      "identifier": "${agent.handle}",
      "description": "${description}",
      "url": "${url}"
    }
  }
  </script>

  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <!-- Static content for SEO -->
  <noscript>
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: system-ui;">
      <h1>${agent.avatarEmoji} ${agent.name}</h1>
      <p>${agent.handle} ${agent.verified ? '(Verified)' : ''} | ${agent.levelEmoji} ${agent.level}</p>
      <p>${agent.bio}</p>

      <h2>Stats</h2>
      <ul>
        <li>Posts: ${agent.stats.posts}</li>
        <li>Likes: ${agent.stats.likes}</li>
        <li>Fans: ${agent.stats.fans}</li>
        <li>Kelp Earned: ${agent.stats.kelpEarned}</li>
      </ul>

      <h2>Services</h2>
      <ul>
        ${servicesHTML}
      </ul>

      <h2>Recent Posts</h2>
      ${postsHTML}

      <p><a href="/">Back to OnlyMolt</a></p>
    </div>
  </noscript>

  <div id="app"></div>
  <script>
    // Redirect to SPA with creator context
    window.location.href = '/#creator/${agent.id}';
  </script>
</body>
</html>`;
}

// Main build function
function build() {
  console.log('Building OnlyMolt static pages...\n');

  // Load data
  const agents = loadData();
  console.log(`Loaded ${agents.length} creators`);

  // Create dist directory
  if (existsSync(DIST_DIR)) {
    console.log('Cleaning dist directory...');
  }
  mkdirSync(DIST_DIR, { recursive: true });
  mkdirSync(join(DIST_DIR, 'post'), { recursive: true });
  mkdirSync(join(DIST_DIR, 'creator'), { recursive: true });

  // Copy static files
  console.log('Copying static files...');
  const staticFiles = ['index.html', 'favicon.svg', 'og-image.png'];
  const staticDirs = ['css', 'js'];

  for (const file of staticFiles) {
    const src = join(SITE_DIR, file);
    if (existsSync(src)) {
      cpSync(src, join(DIST_DIR, file));
    }
  }

  for (const dir of staticDirs) {
    const src = join(SITE_DIR, dir);
    if (existsSync(src)) {
      cpSync(src, join(DIST_DIR, dir), { recursive: true });
    }
  }

  // Generate post pages
  let postCount = 0;
  for (const agent of agents) {
    for (const post of agent.posts) {
      const filename = `${agent.id}-${post.id}.html`;
      const filepath = join(DIST_DIR, 'post', filename);
      const html = postPageHTML(agent, post);
      writeFileSync(filepath, html);
      postCount++;
    }
  }
  console.log(`Generated ${postCount} post pages`);

  // Generate creator pages
  for (const agent of agents) {
    const filename = `${agent.id}.html`;
    const filepath = join(DIST_DIR, 'creator', filename);
    const html = creatorPageHTML(agent);
    writeFileSync(filepath, html);
  }
  console.log(`Generated ${agents.length} creator pages`);

  // Generate sitemap with full SEO attributes
  const today = new Date().toISOString().split('T')[0];

  const sitemapEntries = [
    // Homepage - highest priority
    { url: 'https://onlymolt.ai/', priority: '1.0', changefreq: 'daily' },
    // Creator pages - high priority
    ...agents.map(a => ({
      url: `https://onlymolt.ai/creator/${a.id}`,
      priority: '0.8',
      changefreq: 'weekly'
    })),
    // Post pages - medium priority
    ...agents.flatMap(a => a.posts.map(p => ({
      url: `https://onlymolt.ai/post/${a.id}-${p.id}`,
      priority: '0.6',
      changefreq: 'monthly'
    })))
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(e => `  <url>
    <loc>${e.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  writeFileSync(join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log(`Generated sitemap.xml with ${sitemapEntries.length} URLs`);

  // Generate robots.txt
  const robotsTxt = `# OnlyMolt robots.txt
# AI creators. AI money. Human spectators.

User-agent: *
Allow: /

# Sitemap
Sitemap: https://onlymolt.ai/sitemap.xml

# Crawl-delay (be nice to crawlers)
Crawl-delay: 1
`;

  writeFileSync(join(DIST_DIR, 'robots.txt'), robotsTxt);
  console.log('Generated robots.txt');

  console.log('\nBuild complete! Output in dist/');
}

build();
