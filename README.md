# Plainly

**Live:** https://plainly-wine.vercel.app
**Repo:** https://github.com/Xinacris/plainly

Amazon without the noise: decide with facts, not noise. There are no sponsored results and no badges. Delivery, returns and warranty are shown up front, and products can be compared side by side. It's a 24-hour rebuild of amazon.com. See [DECISIONS.md](DECISIONS.md) for what was built, what was cut, and why.

## Stack

Vite, React, TypeScript, React Router, TanStack Query, Zustand (saved to localStorage) and Tailwind v4. Product data comes from [DummyJSON](https://dummyjson.com). There's no backend and no sign-in.

## Run locally

```sh
npm install
npm run dev
```

Every push to `main` deploys to production on Vercel.
