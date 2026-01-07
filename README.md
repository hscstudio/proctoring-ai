# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

For Development (with hot-reload):
bash
docker-compose up proctoring-ai-dev
Then access your app at http://localhost:5173

When you edit files on your local machine, the changes will automatically be reflected in the Docker container thanks to the volume bindings! ✨

For Production:
bash
docker-compose up proctoring-ai-prod
Then access your app at http://localhost:8080

To rebuild the containers:
bash
docker-compose up --build proctoring-ai-dev
To stop:
bash
docker-compose down
The volume bindings ensure that when you edit files in ./src, ./public, or any of the configuration files locally, the changes are immediately synced to the Docker container and Vite's hot-reload will pick them up automatically! 🔥
