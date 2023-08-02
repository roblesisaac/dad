import { data } from '@ampt/data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
// import Site from '../models/sites';

const app = function () {
  const currentFilePath = fileURLToPath(import.meta.url);
  const viewsDirectory = `${dirname(currentFilePath)}/../../src/views`;

  async function fetchSite() {
    return (await data.get('sites:*')).items[0]?.value;
  }

  function getFileNames(files) {
    return files.filter((file) => file.endsWith('.vue'));
  }

  function pagesForRole(site, role) {
    if(!site) {
      return;
    }

    return site.roles.find(({ name }) => name === role);
  }

  function simplifyName(fullName) {
    const name = fullName.toLowerCase();
    return name.replace('.vue', '').replace('vue', '');
  }

  return {
    getPageNames() {
      return new Promise((resolve, reject) => {
        fs.readdir(viewsDirectory, (err, files) => {
          if (err) {
            return reject('Failed to load pages...');
          }

          const fullFileNames = getFileNames(files);
          const pageNames = fullFileNames.map(simplifyName);
          resolve(pageNames);
        });
      });
    },
    async getDefaultPages(role) {
      const site = await fetchSite();

      return pagesForRole(site, role) 
        || pagesForRole(site, 'public') 
        || await app.getPageNames();
    },
    async servePages(_, res) {
      const pageNames = await app.getPageNames();

      res.json(pageNames);
    }
  };
}();

export default app;