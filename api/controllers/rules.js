import Rules from '../models/rules';

export default {
  deleteRule: async ({ params }, res) => {
    const deletedRule = await Rules.erase(params._ruleId);

    res.json(deletedRule);
  },
  getRules: async (req, res) => {
    const userId = req.user._id;
    const rules = await Rules.findAll({ userId });

    res.json(rules);
  },
  saveRule: async ({ body, user }, res) => {
    const savedRule = await Rules.save({
      ...body,
      userId: user._id
    });
  
    res.json(savedRule);
  },
  updateRule: async ({ params, body }, res) => {
    const updatedRule = await Rules.update(params._ruleId, body);

    res.json(updatedRule);
  }
};