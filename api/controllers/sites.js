import Site from '../models/sites';
import pages from './pages';

const state = {
  siteKey: null
}

const app = function () {
  async function emptySite() {
    return { name: null, roles:[
      { 
        name: 'public',
        views: await pages.getPageNames()
       }
    ]};
  }

  async function siteIdMatchesUpdateId(updateKey) {
    state.siteKey = state.siteKey || (await Site.findOne());

    return updateKey === state.siteKey;
  }

  return {
    createNew: async () => {
      return await Site.save(await emptySite());
    },
    get: async (_, res) => {
      const site = await Site.findOne();

      if(site) {
        return res.json(site);
      };

      res.json(await app.createNew());
    },
    update: async (req, res) => {
      const { body, params: { _id } } = req;

      if(!siteIdMatchesUpdateId(_id)) {
        throw new Error('Invalid Site Object: Site keys must match...');
      }

      res.json(await Site.update(_id, body));
    }
  }
}();

export default app;