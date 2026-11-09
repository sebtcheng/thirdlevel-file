const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Standalone Third Level Officials Module...');

// --- PORT CLEANUP (Windows) ---
const clearPort = (port) => {
  try {
    // Find PID on port and kill it
    const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = stdout.split('\n');
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid) && pid !== '0') {
        console.log(`🧹 Cleaning up old process ${pid} on port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
        } catch (e) {}
      }
    });
  } catch (e) {
    // Port is likely already clear
  }
};

console.log('🔍 Checking for lingering processes...');
if (process.env.PORT) clearPort(process.env.PORT);
clearPort(3008);
clearPort(5173);

const commands = [
  { name: 'API', cmd: 'npm', args: ['run', 'dev'], cwd: path.join(__dirname, 'api') },
  { name: 'UI', cmd: 'npm', args: ['run', 'dev'], cwd: path.join(__dirname, 'ui') }
];

commands.forEach(service => {
  const child = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    shell: true,
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error(`❌ [${service.name}] Error:`, err);
  });

  process.on('SIGINT', () => {
    child.kill();
    process.exit();
  });
});
