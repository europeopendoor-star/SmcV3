const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/<ProtectedRoute>/g, '<>');
code = code.replace(/<\/ProtectedRoute>/g, '</>');
fs.writeFileSync('src/App.tsx', code);
