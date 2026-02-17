# PLEC WordPress Plugin (React + Vite)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build assets:
   ```bash
   npm run build
   ```
3. Activate plugin in WordPress Admin.
4. Add shortcode `[plec]` to any page/post.

## Development

To see live changes inside WordPress (HMR):

```bash
npm run dev
```

The plugin automatically loads the Vite dev server when:
- `WP_DEBUG` is `true`
- Vite is running on `http://localhost:5173`

If your Vite URL is different, set in `wp-config.php`:

```php
define('PLEC_DEV_SERVER', 'http://127.0.0.1:5173');
```

If the dev server is not running, the plugin falls back to built files in `dist/`.
