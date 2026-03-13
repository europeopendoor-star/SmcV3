const fs = require('fs');

// Temporarily remove ProtectedRoute wrapper in App.tsx to verify Dashboard UI
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `<Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />`;

const replacementStr = `<Route path="/dashboard" element={
              <Dashboard />
            } />`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', content);

// Temporarily mock session in Dashboard.tsx
let dbContent = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const originalEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDashboardData(session);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDashboardData(session);
    });

    return () => subscription.unsubscribe();
  }, []);`;

const mockedEffect = `  useEffect(() => {
    // Mock session for visual verification
    setSession({ access_token: 'mock-token', user: { id: 'mock-user' } });
    setAccount({ balance: 10000, equity: 10050, margin_level: 250, margin_free: 8000 });
    setPositions([{ ticket: 12345, symbol: 'XAUUSD', type: 'buy', volume: 0.1, price_open: 2000.50, sl: 1990, tp: 2020, profit: 50.00 }]);
    setPendingOrders([{ ticket: 54321, symbol: 'EURUSD', type: 'buy_limit', volume: 1.0, price_open: 1.0500, sl: 1.0400, tp: 1.0600 }]);
    setLoading(false);
  }, []);`;

dbContent = dbContent.replace(originalEffect, mockedEffect);
fs.writeFileSync('src/pages/Dashboard.tsx', dbContent);
