import Groups from '../models/plaidGroups';
import { getRequestClientId } from '../utils/clientIdentity.js';
import { markResourceUpdated } from '../services/syncMetaService.js';

const app = function() {
  function saveGroup(groupToSave) {
    return Groups.save(groupToSave);
  }

  function updateGroup(groupId, groupUpdates) {
    return Groups.update(groupId, groupUpdates);
  }

  return {
    deleteGroup: async (req, res) => {
      const { params, user } = req;
      const deletedGroup = await Groups.erase(params._groupId);
      await markResourceUpdated({
        userId: user._id,
        resource: 'groups',
        clientId: getRequestClientId(req)
      });

      res.json(deletedGroup);
    },
    getGroups: async (req, res) => {
      const userId = req.user._id;
      const { _groupId } = req.params;

      if(_groupId) {
        const foundGroup = await Groups.findOne(_groupId);

        if(foundGroup.userId !== userId) {
          throw new Error('User not authorized to view this group');
        }

        return res.json(foundGroup);
      }

      const groups = await Groups.findAll({ userId, name: '*' });

      res.json(groups);
    },
    saveGroup: async (req, res) => {
      const { body, user } = req;
      const savedGroup = await saveGroup({
        ...body,
        req: { user }
      });

      await markResourceUpdated({
        userId: user._id,
        resource: 'groups',
        clientId: getRequestClientId(req)
      });
    
      res.json(savedGroup);
    },
    updateGroup: async (req, res) => {
      const { params, body, user } = req;
      const updatedGroup = await updateGroup(params._groupId, { ...body, req: { user }});
      await markResourceUpdated({
        userId: user._id,
        resource: 'groups',
        clientId: getRequestClientId(req)
      });

      res.json(updatedGroup);
    }
  }
}();

export default app;
