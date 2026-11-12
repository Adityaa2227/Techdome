// No-op "setup" project. Its only job is to make the `load` project its TEARDOWN, so
// Playwright runs the load test after every other suite has finished, whether they passed
// or failed. That way the 5 load users never overlap with E2E/integration/security traffic,
// and the brief's 5-concurrent-user limit holds for the whole `npx playwright test` run.
import { test as setup } from '@playwright/test';

setup('run order: functional suites first, load test last', async () => {});
