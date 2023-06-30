import { params } from "@ampt/sdk";
import fetch from "node-fetch";
// import { Validate } from "./recordJS";

const mongo = function() {
  const state = {
    url: `https://data.mongodb-api.com/app/${params('DB_ID')}/endpoint/data/v1/action/`
  };

  function buildDeleteManyOptions(filter) {
    const options = { filter };
      
    return { options };
  }

  function buildDeleteOneOptions(id) {
    const filter = { _id: { $oid: id } },
        options = { filter };

    return { options };
  }

  function buildFindOptions(filter={}) {
    const options = {};

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
    
    return options;
  }

  function buildInsertOptions(data) {
    const propName = Array.isArray(data) ? "documents" : "document";

    const options = { [propName]: data };

    return options;
  }

  function buildUpdateOneOptions(id, body) {
    const filter = { _id: { $oid: id } },
      update = { $set: body };

    return { filter, update };
  }

  async function exec(data, settings={}) {
    const response = await fetchData(data);

    if(settings.verbose) {
      // return detailed response
      return;
    }

    return returnOnlyDocuments(response);
  }
  
  async function fetchData(data) {
    const { collection, url, options } = data;
      
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
    
    const response = await fetch(url, clientRequest);
    
    return await response.json();
  }

  function isSpecial(collection) {
    const specials = [
            // "users", 
            // "permits"
          ];

    return specials.includes(collection);
  }

  function returnOnlyDocuments(response) {
    return Object.keys(response).length 
    ? response.document || response.documents || response 
    : response;
  }

  async function runSpecialfunction(collection) {
    // const specialStep = getSpecialStep();

    // if(specialStep) {
    //   await specialStep(collection);
    // }
  }
  
  async function usersModel() {
    let { data, next } = this;

    const userSchema = {
      name: String,
      age: Number
    };

    // data = await Validate(userSchema, data);

    // next(data.validated);

    // const { user } = this.body;
    // user.password = hash(user.password);
  }

  function permitsModel() {
    console.log("permits model");
    // const { user } = this.body;
    // user.password = hash(user.password);
  }

  return {
    async deleteOne(collection, id, settings) {
      const options = buildDeleteOneOptions(id);
      const url = state.url + 'deleteOne';
      
      return await exec({ collection, options, url }, settings);
    },

    async deleteMany(collection, filter, settings) {
      const options = buildDeleteManyOptions(filter);
      const url = state.url + 'deleteMany';
      
      return await exec({ collection, options, url }, settings);
    },

    async find (collection, filter, settings) {
      const options = buildFindOptions(filter);
      const url = state.url + 'find';
      
      return await exec({ collection, options, url }, settings);
    },

    async findOne(collection, filter, settings) {
      const options = buildFindOptions(filter);
      const url = state.url + 'findOne';
      
      return await exec({ collection, options, url }, settings);
    },

    async insert (collection, data, settings) {
      await runSpecialfunction(collection);

      const options = buildInsertOptions(data);
      const action = Array.isArray(data) ? 'insertMany' : 'insertOne';
      const url = state.url + action;

      return await exec({ collection, options, url }, settings);
    },

    async updateOne (collection, id, body, settings) {
      const options = buildUpdateOneOptions(collection, id, body);
      const url = state.url + 'updateOne';
      
      return await exec({ collection, options, url }, settings);
    },

    async updateMany (collection, options, settings) {
      if(options.filter || options.update) {
        throw error('Missing filter or update parameters');
      }

      const url = state.url + 'updateMany';

      return await exec({ collection, options, url }, settings);
    }

  };
}();

export default mongo;