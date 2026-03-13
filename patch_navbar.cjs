const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Add Terminal to lucide-react imports
content = content.replace('Activity, LineChart, BookOpen, Bell, Menu, X, TrendingUp, LogOut, LogIn', 'Activity, LineChart, BookOpen, Bell, Menu, X, TrendingUp, LogOut, LogIn, Terminal');

// Add Trade Terminal to navItems
const navItemsRegex = /const navItems = \[[\s\S]*?\];/;
const navItemsReplacement = `const navItems = [
    { name: 'Home', path: '/', icon: Activity },
    { name: 'Terminal', path: '/dashboard', icon: Terminal },
    { name: 'Signals', path: '/signals', icon: LineChart },
    { name: 'Chart', path: '/chart', icon: LineChart },
    { name: 'Performance', path: '/performance', icon: TrendingUp },
    { name: 'Education', path: '/education', icon: BookOpen },
    { name: 'Alerts', path: '/alerts', icon: Bell },
  ];`;

content = content.replace(navItemsRegex, navItemsReplacement);

fs.writeFileSync('src/components/Navbar.tsx', content);
