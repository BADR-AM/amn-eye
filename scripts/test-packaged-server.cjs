const path = require('path');
const { pathToFileURL } = require('url');

async function test() {
  try {
    const targetPath = process.argv[2] || 'C:/Program Files/SecurityEye/resources/app/server/server.js';
    const serverScriptPath = path.resolve(targetPath);
    console.log('Testing server import from:', serverScriptPath);
    const serverUrl = pathToFileURL(serverScriptPath).href;
    console.log('URL:', serverUrl);
    await import(serverUrl);
    console.log('SUCCESS: Server imported and started!');
    process.exit(0);
  } catch (err) {
    console.error('ERROR during server start:', err.stack || err);
    process.exit(1);
  }
}

test();
