const fs = require('fs');
const file = 'tsconfig.json';
let config = JSON.parse(fs.readFileSync(file, 'utf8'));

delete config.compilerOptions.exclude;
if (!config.exclude) {
    config.exclude = [];
}
config.exclude.push("supabase/functions/**");

fs.writeFileSync(file, JSON.stringify(config, null, 2));
