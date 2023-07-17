import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

export default (function () {
  const currentFilePath = fileURLToPath(import.meta.url);
  const viewsDirectory = `${dirname(currentFilePath)}/../../src/views`;

  function getFileNames(files) {
    return files.filter((file) => file.endsWith('.vue'));
  }

  function handleError(res, err, message) {
    console.error(err);
    res.status(500).json({ error: message });
  }

  function simplifyName(fullName) {
    const name = fullName.toLowerCase();
    return name.replace('.vue', '').replace('vue', '');
  }

  return {
    loadPages(_, res) {
      fs.readdir(viewsDirectory, (err, files) => {
        if (err) {
          return handleError(res, err, 'Failed to load pages...');
        }
        
        const fullFileNames = getFileNames(files);
        const names = fullFileNames.map(simplifyName);

        res.json(names);
      });
    }
  };
})();