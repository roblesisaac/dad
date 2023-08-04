import { data } from '@ampt/data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import protect from '../middlewares/protect';
import Site from './sites';

const app = function () {
  const currentFilePath = fileURLToPath(import.meta.url);
  const viewsDirectory = `${dirname(currentFilePath)}/../../src/views`;

  async function fetchSite() {
    return (await data.get('sites:*')).items[0]?.value;
  }

  function getClosestRole(allRoles, siteRoles, inputRole) {
    if(siteRoles.includes(inputRole)) {
      return inputRole;
    }

    const userRoleIndex = allRoles.indexOf(inputRole);
    let highestRoleIndex = -1;
    
    for(const role of siteRoles) {
      const roleIndex = allRoles.indexOf(role);

      if(roleIndex > userRoleIndex) {
        continue;
      }

      if(roleIndex > highestRoleIndex) highestRoleIndex = roleIndex;
    }

    return allRoles[highestRoleIndex];
  }

  function getFileNames(files) {
    return files.filter((file) => file.endsWith('.vue'));
  }

  function getSiteRolesArray(site) {
    if(!site.roles) {
      throw new Error('Site is missing roles...');
    }

    return site.roles.map(role => role.name);
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
    getPageNames: () => {
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
    getDefaultPages: async (inputRole='public') => {
      const site = await fetchSite() || await Site.createNew();
      const siteRoles = getSiteRolesArray(site);
      const closestRole = getClosestRole(protect.allRoles, siteRoles, inputRole);
      const pages = pagesForRole(site, closestRole);

      if(inputRole === 'public' && !pages.views.includes('login')) {
        pages.views.push('login');
      }

      if(inputRole !== 'public' && !pages.views.includes('logout')) {
        pages.views.push('logout');
      }

      return pages;
    },
    serveAllPages: async (_, res) => {
      const pageNames = await app.getPageNames();

      res.json(pageNames);
    }
  };
}();

export default app;