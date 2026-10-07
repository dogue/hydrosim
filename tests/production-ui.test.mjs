// Exercise the exact minified assets emitted by Vite, including bundled React.
process.env.HYDROSIM_TEST_PRODUCTION='1';
await import('./ui.test.mjs');
