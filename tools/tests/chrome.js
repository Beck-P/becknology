// The Chromium the tests launch: $CHROME, else the one pre-installed in Claude Code's cloud containers, else
// Playwright's own (undefined).
const fs = require('fs');
const BUILT_IN = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
module.exports = process.env.CHROME || (fs.existsSync(BUILT_IN) ? BUILT_IN : undefined);
