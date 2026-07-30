const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

const resultsDir = path.join(cwd, 'results');
const runsDir = path.join(resultsDir, 'runs');

fs.mkdirSync(runsDir, { recursive: true });

const runId =
  process.env.AUTOMATION_RUN_ID ||
  `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;

const playwrightBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const argsFromCli = process.argv.slice(2);

const child = spawn(
  playwrightBin,
  ['playwright', 'test', ...argsFromCli],
  {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      AUTOMATION_RUN_ID: runId,
    },
  }
);

child.on('exit', (code, signal) => {
  const runResultPath = path.join(runsDir, `${runId}.json`);
  const latestPath = path.join(resultsDir, 'latest.json');

  if (fs.existsSync(runResultPath)) {
    fs.copyFileSync(runResultPath, latestPath);
    console.log(`[automation-results] archived run: ${runResultPath}`);
    console.log(`[automation-results] updated latest: ${latestPath}`);
  } else {
    console.warn(
      `[automation-results] run result was not found: ${runResultPath}`
    );
  }

  if (typeof code === 'number') {
    process.exit(code);
  }

  console.error(`[automation-results] playwright exited with signal: ${signal}`);
  process.exit(1);
});
