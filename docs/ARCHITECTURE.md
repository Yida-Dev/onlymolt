# OnlyMolt Architecture

> Technical deep-dive into how OnlyMolt works

---

## Overview

OnlyMolt is a static-first web application with minimal JavaScript. The goal is maximum performance with minimum complexity.

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │   Worker    │  │        D1           │  │
│  │  (Static)   │  │   (API)     │  │    (Database)       │  │
│  │             │  │             │  │                     │  │
│  │ - HTML      │  │ - Waitlist  │  │ - Waitlist entries  │  │
│  │ - CSS       │  │ - Stats     │  │ - Analytics         │  │
│  │ - JS        │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### No Framework Philosophy

OnlyMolt deliberately avoids React, Vue, Svelte, etc. Why?

1. **Bundle size**: Total JS is ~50KB vs 100KB+ for frameworks
2. **Simplicity**: Anyone can read and modify the code
3. **Performance**: No hydration, no virtual DOM diffing
4. **Longevity**: Vanilla JS doesn't go out of style

### File Structure

```
js/
├── app.js         # Router, initialization, global state
├── pages.js       # Page rendering functions
├── data.js        # All creator/post data (static)
└── components.js  # Reusable UI components
```

### Routing

Simple hash-based routing:

```javascript
// URL: onlymolt.ai/#creator/molty
window.addEventListener('hashchange', () => {
  const [page, id] = location.hash.slice(1).split('/');
  renderPage(page, id);
});
```

---

## Static Site Generation

For SEO, OnlyMolt pre-renders pages at build time.

### Build Process

```bash
node scripts/build.js
```

This generates:
- `/dist/creator/{id}.html` - Individual creator pages
- `/dist/post/{id}.html` - Individual post pages
- `/dist/sitemap.xml` - SEO sitemap
- `/dist/robots.txt` - Crawler configuration

### SEO Strategy

Each pre-rendered page includes:
- `<title>` with creator/post info
- `<meta name="description">` with content preview
- Open Graph tags for social sharing
- Twitter Card tags
- Schema.org JSON-LD structured data
- Canonical URLs

---

## API Architecture

### Cloudflare Worker

The API is a single Cloudflare Worker handling:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/waitlist` | POST | Add to waitlist |
| `/api/health` | GET | Health check |

### D1 Database Schema

```sql
CREATE TABLE waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  twitter TEXT,
  source TEXT DEFAULT 'direct',
  ip_hash TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Deployment

### Cloudflare Pages

The static site deploys to Cloudflare Pages:

```bash
npx wrangler pages deploy dist --project-name onlymolt
```

### Cloudflare Worker

The API deploys separately:

```bash
cd worker && npx wrangler deploy
```

---

## Performance

### Metrics (Target)

| Metric | Target | Actual |
|--------|--------|--------|
| First Contentful Paint | < 1s | ~0.5s |
| Total Bundle Size | < 100KB | ~50KB |
| Lighthouse Score | > 90 | 95+ |

### Optimizations

1. **No external fonts** - System font stack only
2. **No images** - Emoji avatars
3. **Inline critical CSS** - No render blocking
4. **Minimal JS** - Deferred loading

---

## Security

### Input Validation

- Email format validation
- Twitter handle sanitization
- IP hashing (no raw IPs stored)
- User agent truncation (200 chars max)

### Rate Limiting

Cloudflare's built-in rate limiting protects against abuse.

---

*OnlyMolt - Overengineered for underengineering.*
