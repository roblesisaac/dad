import Groups from '../models/plaidGroups';

const app = function() {
  function saveGroup(groupToSave) {
    return Groups.save(groupToSave);
  }

  function updateGroup(groupId, groupUpdates) {
    return Groups.update(groupId, groupUpdates);
  }

  return {
    deleteGroup: async ({ params }, res) => {
      const deletedGroup = await Groups.erase(params._groupId);

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

      const groups = await Groups.find({ userId, name: '*' });

      res.json(groups);
    },
    saveGroup: async ({ body, user }, res) => {
      const savedGroup = await saveGroup({
        ...body,
        req: { user }
      });
    
      res.json(savedGroup);
    },
    updateGroup: async ({ params, body, user }, res) => {
      const updatedGroup = await updateGroup(params._groupId, { ...body, req: { user }});

      res.json(updatedGroup);
    }
  }
}();

export default app;