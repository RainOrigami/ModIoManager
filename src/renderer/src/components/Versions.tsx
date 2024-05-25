import { useState } from 'react';
import packageJson from '../../../../package.json';

function Versions(): JSX.Element {
  const [versions] = useState(window.electron.process.versions);

  return (
    <ul className="versions">
      <li className="app-version">Mod Manager v{packageJson.version}</li>
      <li className="electron-version">Electron v{versions.electron}</li>
      <li className="chrome-version">Chromium v{versions.chrome}</li>
      <li className="node-version">Node v{versions.node}</li>
    </ul>
  );
}

export default Versions;
