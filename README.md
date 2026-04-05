# Recipe App

Recipe App is a lightweight recipe discovery product built with HTML, CSS, and vanilla JavaScript. It now supports live meal search, saved recipes, sharable deep links, and installable PWA behavior on supported browsers.

## Product Features

- Real-time recipe search powered by TheMealDB
- Saved recipes stored in `localStorage`
- Recent search history for quick repeat searches
- Shareable recipe URLs that reopen the selected meal state
- Installable web app support with a web manifest and service worker
- Responsive layout for desktop and mobile screens

## Technology Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Vite for local development and production builds
- TheMealDB API

## Project Structure

```text
recipe-app/
|-- .github/
|   `-- workflows/
|       `-- deploy-pages.yml
|-- LICENSE
|-- index.html
|-- package.json
|-- public/
|   |-- favicon.svg
|   |-- manifest.webmanifest
|   `-- sw.js
|-- script.js
|-- style.css
|-- vite.config.js
`-- README.md
```

## Getting Started

1. Install dependencies with `npm install`.
2. Start the local server with `npm run dev`.
3. Open the local address printed by Vite, or use a VS Code launch configuration that targets the Vite server.

## Available Scripts

- `npm run dev`: starts the local development server
- `npm run build`: creates a production build in `dist/`
- `npm run preview`: previews the built production output locally

## Product Notes

- Saved recipes and recent searches are browser-local, so they stay on the same device and browser profile.
- Share links work best when the app is served over `http://localhost` or a deployed HTTPS URL.
- PWA install and offline shell support also require a served origin such as local Vite dev or production hosting.

## Deployment

The project is prepared for GitHub Pages deployment through GitHub Actions.

1. Create a new GitHub repository for this folder.
2. Push the project to the `main` branch.
3. In GitHub, open `Settings -> Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Push future changes to `main` and the workflow in `.github/workflows/deploy-pages.yml` will build and publish `dist/`.

For repository sites such as `https://UGURAKSAHIN.github.io/<repo>/`, the workflow sets the correct Vite base path automatically during the build.

You can still deploy the production `dist/` folder to any other static hosting provider after running `npm run build`.

## License

This project is licensed under the MIT License.
