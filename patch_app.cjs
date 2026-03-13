const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
content = content.replace("import Login from './pages/Login';", "import Login from './pages/Login';\nimport Dashboard from './pages/Dashboard';");

// Add route
const routeStr = `<Route path="/performance" element={
              <>
                <Performance />
              </>
            } />`;

const routeReplacement = `<Route path="/performance" element={
              <>
                <Performance />
              </>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />`;

content = content.replace(routeStr, routeReplacement);

fs.writeFileSync('src/App.tsx', content);
