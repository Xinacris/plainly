// While accounts are being built in checkpoints (each push deploys), the sign-in
// entry points stay hidden in production: the routes exist, and test builds
// (`vite build --mode test`, pointed at plainly-test) show them so they can be
// verified. Switched on for everyone in the last step.
export const ACCOUNTS_ENABLED = import.meta.env.MODE === 'test'
