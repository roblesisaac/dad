import Rules from '../models/rules';

const app = function() {
  function saveRule(ruleToSave) {
    return Rules.save(ruleToSave);
  }

  function updateRule(ruleId, ruleToUpdate) {
    return Rules.update(ruleId, ruleToUpdate);
  }

  return {
    deleteRule: async ({ params }, res) => {
      const deletedRule = await Rules.erase(params._ruleId);

      res.json(deletedRule);
    },
    getRules: async (req, res) => {
      const userId = req.user._id;
      const rules = await Rules.find({ userId });

      res.json(rules);
    },
    saveRule: async ({ body, user }, res) => {
      const savedRule = await saveRule({
        ...body,
        user
      });
    
      res.json(savedRule);
    },
    updateRule: async ({ params, body }, res) => {
      const updatedRule = await updateRule(params._ruleId, body);

      res.json(updatedRule);
    }
  }
}();

export default app;