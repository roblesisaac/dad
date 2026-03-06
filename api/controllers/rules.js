import Rules from '../models/rules';
import { getRequestClientId } from '../utils/clientIdentity.js';
import { markResourceUpdated } from '../services/syncMetaService.js';

export default {
  deleteRule: async (req, res) => {
    const { params, user } = req;
    const deletedRule = await Rules.erase(params._ruleId);
    await markResourceUpdated({
      userId: user._id,
      resource: 'rules',
      clientId: getRequestClientId(req)
    });

    res.json(deletedRule);
  },
  getRules: async (req, res) => {
    const userId = req.user._id;
    const rules = await Rules.findAll({ userId });

    res.json(rules);
  },
  saveRule: async (req, res) => {
    const { body, user } = req;
    const savedRule = await Rules.save({
      ...body,
      userId: user._id
    });

    await markResourceUpdated({
      userId: user._id,
      resource: 'rules',
      clientId: getRequestClientId(req)
    });
  
    res.json(savedRule);
  },
  updateRule: async (req, res) => {
    const { params, body, user } = req;
    const updatedRule = await Rules.update(params._ruleId, body);
    await markResourceUpdated({
      userId: user._id,
      resource: 'rules',
      clientId: getRequestClientId(req)
    });

    res.json(updatedRule);
  }
};
