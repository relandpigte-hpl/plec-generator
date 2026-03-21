# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WordPress-based SIP (Staged Interactive Prototype) generator. A React plugin lets users upload video assets (MP4/GIF), select ad networks, and generate downloadable ZIP archives containing network-specific playable HTML ads with embedded video.

## Development Commands

### Plugin (React frontend)
```bash
cd wp-content/plugins/plec/
npm install        # install dependencies
npm run dev        # Vite dev server with HMR (localhost:5173)
npm run build      # production build to dist/
```

### Theme (TailPress)
```bash
cd wp-content/themes/plec/
npm install        # install Node dependencies
composer install   # install PHP dependencies (TailPress framework)
npm run dev        # Vite dev server (localhost:3000)
npm run build      # production build to dist/
```

No test framework or linter is configured.

## Architecture

### Plugin (`wp-content/plugins/plec/`)

**`plec.php`** — Singleton PHP class that registers the `[plec]` shortcode, handles AJAX ZIP generation (`wp_ajax_plec_generate_zip`), manages Vite dev/prod asset loading, and enforces security (nonce, role checks, file validation).

**`src/App.jsx`** — Main React component. Row-based UI where each row holds portrait + landscape video files. Users select target ad networks and submit. FormData POST goes to the AJAX endpoint.

**`templates/sip-template.html`** — HTML template rendered server-side per row × network combination. Videos are embedded as data URIs. Each network gets its own clickthrough JavaScript adapter.

**Data flow:** User uploads → React validation → FormData POST → PHP validates & renders templates → ZIP created in `uploads/plec-generated/` → download URL returned → auto-cleanup after 1 hour.

### Theme (`wp-content/themes/plec/`)

TailPress v5 framework theme. `functions.php` redirects unauthenticated users to login and handles role-based post-login redirects. Vite compiles Tailwind CSS assets.

### Key Constraints

- Allowed file types: MP4, GIF only
- Max combined size per row: 3.4 MB (portrait + landscape)
- Max 20 files per request
- Requires administrator or subscriber WordPress role
- 8 supported ad networks: AppLovin, Facebook, Google, Unity, Vungle, Mintegral, IronSource, Moloco

### Vite Dev Server Detection

The plugin checks if Vite dev server is running at `localhost:5173` before loading assets. Override with `define('PLEC_DEV_SERVER', 'http://...')` in `wp-config.php`. Falls back to built `dist/` assets if dev server is unreachable.

## WordPress Setup

- Database dump: `hpl_plec.sql` (root level)
- Config: `wp-config.php` (contains DB credentials)
- Plugin shortcode: `[plec]` on any page/post
