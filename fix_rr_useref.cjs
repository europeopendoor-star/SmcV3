const fs = require('fs');
const path = 'src/components/chart/RiskRewardTool.tsx';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(/import React, \{ useState, useEffect, useCallback \} from 'react';/, `import React, { useState, useEffect, useCallback, useRef } from 'react';`);

fs.writeFileSync(path, code);
