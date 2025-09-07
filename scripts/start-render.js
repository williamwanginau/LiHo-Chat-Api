/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('node:child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('[start-render] prisma migrate deploy');
  await run('npm', ['run', 'prisma:deploy']);

  const shouldSeed = process.env.SEED_ALLOW_PROD === 'true' || process.env.SEED_ON_START === 'true';
  if (shouldSeed) {
    console.log('[start-render] seeding database...');
    await run('npm', ['run', 'prisma:seed']);
  } else {
    console.log('[start-render] skipping seed (set SEED_ALLOW_PROD=true to enable)');
  }

  console.log('[start-render] starting app');
  await run('npm', ['run', 'start:prod']);
}

main().catch((err) => {
  console.error('[start-render] failed:', err);
  process.exit(1);
});
