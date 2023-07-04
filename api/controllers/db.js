import mongo from "../utils/mongo.js";

export default (function() {
  function buildFilter(req, defaults = {}) {
    const { query } = req;
    return { ...defaults, ...query };
  }

  function getCollectionName(req) {
    const { component } = req.params;

    return component;
  }

  return {
    async deleteOne(req, res) {
      const collection = getCollectionName(req);
      const data = await mongo.deleteOne(collection, req.params.id);

      res.json(data)
    },
    async deleteMany(req, res) {
      const collection = getCollectionName(req);
      const data = await mongo.deleteMany(collection, req.body);

      res.json(data)
    },
    async find(req, res) {
      const collection = getCollectionName(req);
      const filter = buildFilter(req, { limit: 50 });  
      const data = await mongo.find(collection, filter);

      res.json(data)
    },
    async findOne(req, res) {
      const collection = getCollectionName(req);
      const filter = buildFilter(req, { id: req.params.id });  
      const data = await mongo.findOne(collection, filter);

      res.json(data)
    },
    async insert(req, res) {
      const collection = getCollectionName(req);
      const data = await mongo.insert(collection, req.body);

      res.json(data)
    },
    async updateOne(req, res) {
      const collection = getCollectionName(req);
      const { params: { id }, body } = req;
      const data = await mongo.updateOne(collection, id, body);
      
      res.json(data);
    },
    async updateMany(req, res) {
      const collection = getCollectionName(req);
      const data = mongo.updateMany(collection, req.body);

      res.json(data);
    }
  };
})();