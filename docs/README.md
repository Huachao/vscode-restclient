# REST Client CE Documentation

This directory contains the GitHub Pages documentation for REST Client CE VS Code extension.

## Local Development

### Prerequisites

- [Ruby](https://www.ruby-lang.org/) (2.7 or higher)
- [Bundler](https://bundler.io/) (`gem install bundler`)
- Jekyll and dependencies (`bundle install`)

### Setup

1. Install dependencies:

```bash
bundle install
```

2. Run the development server:

```bash
bundle exec jekyll serve
```

3. Open `http://localhost:4000/vscode-restclient/` in your browser.

> **Note:** The site is served at `/vscode-restclient/` because `baseurl` is set in `_config.yml` for GitHub Pages.

### Preview Without Jekyll

You can also preview the site using VS Code's built-in preview:
- Open any `.html` file
- Right-click in the editor and select **"Open Preview"**
- Note: This won't process Liquid/Jekyll templates; use `jekyll serve` for full preview.

## Structure

```
docs/
├── _config.yml        # Jekyll configuration
├── _layouts/          # HTML layout templates
│   ├── default.html  # Base layout
│   └── page.html     # Page-specific layout
├── _includes/         # Reusable components
│   ├── header.html
│   ├── navigation.html
│   └── footer.html
├── assets/
│   └── css/
│       └── style.css # Main stylesheet
├── index.md           # Home page
├── features.md        # Features documentation
├── usage.md           # Usage guide
├── authentication.md  # Authentication methods
├── variables.md       # Variables reference
├── settings.md        # Configuration settings
└── http-language.md   # HTTP language support
```

## Content Management

### Adding a New Page

1. Create a new markdown file in `docs/` (e.g., `advanced.md`)
2. Add front matter:

```markdown
---
title: Advanced Topics
description: Advanced usage patterns and techniques
---
```

3. Add content in markdown format
4. Update navigation in `_config.yml`:

```yaml
navigation:
  - title: Home
    url: /
  - title: Advanced    # Add this
    url: /advanced/    # Add this
  # ... other items
```

5. Rebuild the site

### Updating Content

- Edit the appropriate `.md` file
- The site uses [Kramdown](https://kramdown.gettalong.org/) for markdown processing
- Code blocks are automatically syntax-highlighted using Highlight.js
- Use `{% raw %}...{% endraw %}` if Liquid syntax conflicts with content

## GitHub Pages Deployment

This documentation is configured to deploy automatically via GitHub Pages.

### Required Settings

In your GitHub repository:

1. Go to **Settings** → **Pages**
2. Set **Source** to:
   - **Branch:** `main` (or `master`)
   - **Folder:** `/docs`
3. Click **Save**

GitHub will build and deploy the site. Access at:

```
https://vscode-restclient.github.io/vscode-restclient/
```

### Manual Build (Optional)

If you want to build the site manually before committing:

```bash
bundle exec jekyll build
```

Generated files will be in `_site/`. Commit the source files only (`_config.yml`, layouts, includes, markdown, assets). GitHub handles the build automatically.

### Custom Domain (Optional)

To use a custom domain:

1. Create a `CNAME` file in `docs/` with your domain:

```
docs.example.com
```

2. In repository **Settings** → **Pages** → **Custom domain**, enter your domain
3. Configure DNS:
   - `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Or `CNAME`: `vscode-restclient.github.io` (for subdomains)

## Styling

The theme is custom CSS in `assets/css/style.css`. Key features:

- Responsive design (mobile-friendly)
- CSS custom properties for easy theming
- Clean, documentation-focused layout
- Sidebar navigation
- Syntax highlighting via Highlight.js

To customize:

1. Edit `assets/css/style.css`
2. Variables at `:root`:
   - `--color-primary` - Main accent color
   - `--color-text` - Text color
   - `--color-background` - Background color
   - `--sidebar-width` - Sidebar width
   - `--header-height` - Header height

Refresh to see changes.

## Troubleshooting

### Jekyll build fails with "Could not find gem"
Run `bundle install` to install dependencies.

### Pages not updating on GitHub
- GitHub Pages builds may take 1-3 minutes
- Check **Settings** → **Pages** for build status
- Ensure `_config.yml` has `baseurl: /vscode-restclient`
- Verify all files are committed and pushed

### Styles not loading
- Clear browser cache
- Check `baseurl` is correct in `_config.yml`
- Ensure CSS path: `{{ '/assets/css/style.css' | relative_url }}`

### Liquid syntax in code blocks
If showing Liquid output in code blocks, wrap with `{% raw %}` and `{% endraw %}`:

```liquid
{% raw %}
{{ some_variable }}
{% endraw %}
```

## Contributing

To contribute to the documentation:

1. Edit the appropriate markdown file in `docs/`
2. Test locally with `bundle exec jekyll serve`
3. Commit and push changes
4. GitHub Pages will auto-deploy

For major redesigns, update:
- `_layouts/` - HTML structure
- `_includes/` - Component snippets
- `assets/css/style.css` - Styles

## Need Help?

- [Original README](https://github.com/vscode-restclient/vscode-restclient)
- [Issue Tracker](https://github.com/vscode-restclient/vscode-restclient/issues)