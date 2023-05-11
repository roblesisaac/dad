// import { data } from "@ampt/data";
import { Aid } from "../utils/aidkit";
import mongo from "../utils/mongo.js";
import authenticate from "../utils/authenticate.js";

export default new Aid({
  steps: {
    mongoDeleteMany: function() {    
      const { collection, req, next } = this;
      
      mongo.deleteMany(collection, req.body).then(next);
    },
    mongoDeleteOne: function() {
      const { collection, req, next } = this,
        id = req.params.id;

      mongo.deleteOne(collection, id).then(next);
    },
    mongoFind: function() {
      const { collection, req, next } = this,
          filter = req.query;

      filter._limit = filter._limit || 50;
      
      mongo.find(collection, filter).then(next);
    },
    mongoFindOne: function() {
      const { collection, req, next } = this,
          filter = req.query;

      filter._id = req.params.id;
      
      mongo.findOne(collection, filter).then(next);
    },
    mongoUpdateOne: function() {
      const { collection, next, req } = this,
          id = req.params.id;

      mongo.updateOne(collection, id, req.body).then(next);
    },
    mongoHandler: function() {
      const { action, collection, options, next } = this;

      mongo[action](collection, options).then(next);
    },
    serve: function(last) {
      const { res } = this;
      res.json(last);
      return;
    }
  },
  instruct: {
    _exec: [
      "mongoHandler",
      "serve"
    ],
    _setup: (req, res) => [
      {
        // res, // only needed when vite build minifies
        params: req.params,
        collection: "params.component"
      },
      // { user: { name: "isaac" } },
      // authenticate.user_({ name: "isaac12" })
    ],
    deleteOne: (req, res) => [
      "_setup", "mongoDeleteOne", "serve"
    ],
    deleteMany: (req, res) => [
      "_setup", "mongoDeleteMany", "serve"
    ],
    find: (req, res) => [
      "_setup", "mongoFind", "serve"
    ],
    findOne: (req,res) => [
      "_setup", "mongoFindOne", "serve"
    ],
    insert: (req, res) => [
      "_setup", 
      mongo.insert_("collection", "req.body"),
      "serve"
    ],
    updateOne: (req, res, buildActionOptions) => [
      "_setup", "mongoUpdateOne", "serve"
    ],
    updateMany: (req, res) => [
      "_setup",
      mongo.updateMany_("collection", "req.body"),
      "serve"
    ]
  },
  catch: function (error) {
    const { res } = this;
    console.log({ error });
    res.json(error.error);
  }
});

// export default async (req, res) => {
//   // Get users from Serverless Data
//   let result = await data.get("user:*", true);
//   // Return the results
//   res.send({
//     users: result.items,
//   });
// }