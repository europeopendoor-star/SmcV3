const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace("import { supabase } from '../supabaseClient';", "import { supabase } from '../lib/supabase';");

fs.writeFileSync('src/pages/Dashboard.tsx', content);
