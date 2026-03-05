const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf-8');

// Bypass auth temporarily for testing
code = code.replace(/if \(!user\)/, 'if (false)');

fs.writeFileSync(path, code);
