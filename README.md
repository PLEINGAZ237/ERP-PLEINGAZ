# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.




```
ERP-PLEINGAZ
├─ README.md
├─ eslint.config.js
├─ fix-imports.mjs
├─ git
├─ index.html
├─ package-lock.json
├─ package.json
├─ public
│  └─ vite.svg
├─ q
├─ src
│  ├─ App.css
│  ├─ App.jsx
│  ├─ assets
│  │  └─ react.svg
│  ├─ components
│  │  ├─ ProtectedRoute.jsx
│  │  ├─ RoleGuard.jsx
│  │  ├─ admin
│  │  │  ├─ AdminLayout.jsx
│  │  │  └─ CrudTable.jsx
│  │  └─ besoins
│  │     ├─ ChaineValidation.jsx
│  │     ├─ analyse
│  │     │  └─ AnalyseLayout.jsx
│  │     ├─ caissiere
│  │     │  └─ CaissiereLayout.jsx
│  │     ├─ dfc
│  │     │  └─ DFCLayout.jsx
│  │     ├─ dg
│  │     │  └─ DGLayout.jsx
│  │     ├─ employe
│  │     │  └─ EmployeLayout.jsx
│  │     └─ justif
│  │        └─ JustifLayout.jsx
│  ├─ contexts
│  │  └─ AuthContext.jsx
│  ├─ index.css
│  ├─ lib
│  │  ├─ exportBesoins.js
│  │  └─ supabase.js
│  ├─ main.jsx
│  └─ pages
│     ├─ ChangePassword.jsx
│     ├─ CompleteProfile.jsx
│     ├─ Login.jsx
│     ├─ admin
│     │  ├─ AdminDashboard.jsx
│     │  ├─ Agences.jsx
│     │  ├─ Banques.jsx
│     │  ├─ Caisses.jsx
│     │  ├─ Citernes.jsx
│     │  ├─ Departements.jsx
│     │  ├─ Entreprises.jsx
│     │  ├─ Magasins.jsx
│     │  ├─ Modules.jsx
│     │  ├─ Roles.jsx
│     │  ├─ Services.jsx
│     │  ├─ Utilisateurs.jsx
│     │  └─ Virements.jsx
│     ├─ besoins
│     │  ├─ BesoinsDashboard.jsx
│     │  ├─ caissiere
│     │  │  ├─ CaissiereDashboard.jsx
│     │  │  └─ Decaissement.jsx
│     │  ├─ dfc
│     │  │  ├─ DFCDashboard.jsx
│     │  │  └─ ValiderBesoin.jsx
│     │  ├─ dg
│     │  │  ├─ AnalyseBesoins.jsx
│     │  │  ├─ DGDashboard.jsx
│     │  │  ├─ DetailBesoinAnalyse.jsx
│     │  │  └─ ValiderBesoinDG.jsx
│     │  ├─ employe
│     │  │  ├─ CreerBesoin.jsx
│     │  │  ├─ DetailBesoin.jsx
│     │  │  ├─ EmployeDashboard.jsx
│     │  │  └─ MesBesoins.jsx
│     │  └─ justif
│     │     ├─ JustifDashboard.jsx
│     │     └─ SaisirJustificatif.jsx
│     └─ portails
│        └─ Dashboard.jsx
├─ supabase
│  ├─ .temp
│  │  └─ cli-latest
│  ├─ config.toml
│  └─ functions
│     ├─ create-user
│     │  ├─ .npmrc
│     │  ├─ deno.json
│     │  └─ index.ts
│     └─ send-email-notification
│        ├─ .npmrc
│        ├─ deno.json
│        └─ index.ts
└─ vite.config.js

```