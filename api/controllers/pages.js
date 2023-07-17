import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

export function loadPages(req, res) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const viewsDirectory = `${dirname(currentFilePath)}/../../src/views`;

  fs.readdir(viewsDirectory, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load pages' });
    } else {
      const fileNames = files.filter((file) => file.endsWith('.vue'));

      res.json(fileNames);
    }
  });
}