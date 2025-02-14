import Tabs from '../models/tabs';

const app = function() {
  function saveTab(tabToSave) {
    return Tabs.save(tabToSave);
  }

  function updateTab(tabId, tabToUpdate) {
    return Tabs.update(tabId, tabToUpdate);
  }

  return {
    deleteTab: async ({ params }, res) => {
      const deletedTab = await Tabs.erase(params._tabId);

      res.json(deletedTab);
    },
    getTabs: async (req, res) => {
      const userId = req.user.metadata.legacyId;
      const s = await Tabs.findAll({ userId });

      res.json(s);
    },
    saveTab: async ({ body, user }, res) => {
      const savedTab = await saveTab({
        ...body,
        user
      });
    
      res.json(savedTab);
    },
    updateTab: async ({ params, body }, res) => {
      const updatedTab = await updateTab(params._tabId, body);

      res.json(updatedTab);
    }
  }
}();

export default app;