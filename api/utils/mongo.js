import { params } from "@ampt/sdk";
import { Aid } from "./aidkit";
import fetch from "node-fetch";
import { validate } from "./validate.js";

export default new Aid({
  data: { 
    url: `https://data.mongodb-api.com/app/${params('DB_ID')}/endpoint/data/v1/action/`
  },
  steps: {
    fetch: function() {
      const { collection, options, next, url } = this;
        
      const body = {
        collection,
        database: "plaza",
        dataSource: "peach",
        ...options
      };
        
      const headers = {
        "Content-Type": "application/json",
        "Access-Control-Request-Headers": "*",
        "api-key": params('DB_TOKEN')
      };
      
      const clientRequest = {
        method: "post",
        body: JSON.stringify(body),
        headers
      };

      
      
      fetch(url, clientRequest).then(res => res.json())
        .then(next)
        .catch(next);
    },
    buildDeleteManyOptions: function() {
      const { collection, filter, learn } = this,
          options = { filter };
        
      learn({ options });
    },
    buildDeleteOneOptions: function() {
      const { id, learn } = this,
          filter = { _id: { $oid: id } },
          options = { filter };

      learn({ options });
    },
    buildFindOptions: function() {
      let { filter, learn } = this;
      const options = {};

      filter = filter || {};

      const formats = {
        _id: (value) => {
          filter._id = { $oid: value };
        },
        _limit: (value) => {
          options.limit = Number(value);
          delete filter._limit;
        },
        _skip: (value) => {
          options.skip = Number(value);
          delete filter._skip;
        },
        _select: (value) => {
          if(!value) return;

          let projection = {};

          value.split(" ").forEach(selection => {
            const hideProp = selection.includes("-");

            selection = selection.replace("-", "");        
            projection[selection] = hideProp ? 0 : 1;
          });

          options.projection = projection;
          delete filter._select;
        }
      };
        
      const formatFilter = (prop) => {
        if(prop in formats == "false") {
          return;
        }

        const currentValue = filter[prop],
            format = formats[prop];

        if(format) format(currentValue);
      };
        
      Object.keys(filter).forEach(formatFilter);
      
      options.filter = filter;
      
      learn({ options });
    },
    buildInsertOptions: function() {
      const { data, learn } = this,
          options = {},
          propName = Array.isArray(data) ? "documents" : "document";

      options[propName] = data;

      learn({ options });
    },
    buildUpdateOneOptions: function() {
      const { collection, id, body, learn } = this,
      filter = { _id: { $oid: id } },
      update = { $set: body },
      options = { filter, update };

      learn({ options });
    },
    isSpecial: function() {
      const { collection, next } = this,
            specials = [
              // "users", 
              // "permits"
            ];

      next(specials.includes(collection));
    },
    returnOnlyDocuments: function(last) {
      const { next } = this;
      const data = Object.keys(last).length 
                    ? last.document || last.documents || last 
                    : last;
      
      next(data);
    },
    usersModel: async function() {
      let { data, next } = this;

      const userSchema = {
        name: String,
        age: Number
      };

      data = await validate(userSchema, data);

      next(data.validated);

      // const { user } = this.body;
      // user.password = hash(user.password);
    },
    permitsModel: function() {
      console.log("permits model");
      // const { user } = this.body;
      // user.password = hash(user.password);
    }
  },
  catch: function(error) {
    const { res } = this;
    
    if(res) {
      res.json(error.error);
    } else {
      console.log({
        message: "nope",
        self: this
      });
      console.log(error);
    }
  },
  instruct: {
    _exec: [
      "fetch",
      { if: { has: "settings.verbose" }, false: "returnOnlyDocuments" }
    ],
    _setup: (collection) => [
      { 
        if: "isSpecial", 
        true: collection+"Model"
      }
    ],
    deleteOne: (collection, id, settings) => [
      { concat: "deleteOne", to: "url" }, 
      "buildDeleteOneOptions",
      "_exec"
    ],
    deleteMany: (collection, filter, settings) => [
      { concat: "deleteMany", to: "url" }, 
      "buildDeleteManyOptions",
      "_exec"
    ],
    find: (collection, filter, settings) => [
      "buildFindOptions", 
      { concat: "find", to: "url" },
      "_exec"
    ],
    findOne: (collection, filter, settings) => [
      "buildFindOptions",
      { concat: "findOne", to: "url" },
      "_exec"
    ],
    insert: (collection, data, settings) => [
      { log: data },
      "_setup",
      "buildInsertOptions",
      {
        if: { isArray: "data" },
        true: { action: "insertMany" },
        false: { action: "insertOne" },
      },
      { concat: "action", to: "url" },
      "_exec"
    ],
    updateOne: (collection, id, body, settings) => [
      { concat: "updateOne", to: "url" },
      "buildUpdateOneOptions",
      "_exec"
    ],
    updateMany: (collection, options, settings) => [
      { require: ["options.filter", "options.update"] },
      { concat: "updateMany", to: "url" },
      "_exec"
    ]
  }
});