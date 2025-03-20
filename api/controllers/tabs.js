import Tabs from '../models/tabs';

export default {
  deleteTab: async ({ params }, res) => {
    const deletedTab = await Tabs.erase(params._tabId);

    res.json(deletedTab);
  },

  getTabs: async (req, res) => {
    const userId = req.user._id;
    const s = await Tabs.findAll({ userId });

    res.json(s);
  },

  saveTab: async ({ body, user }, res) => {
    const savedTab = await Tabs.save({
      ...body,
      userId: user._id
    });
  
    res.json(savedTab);
  },

  updateTab: async ({ params, body }, res) => {
    const updatedTab = await Tabs.update(params._tabId, body);

    res.json(updatedTab);
  }
}