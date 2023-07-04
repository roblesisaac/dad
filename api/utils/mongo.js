import { params } from "@ampt/sdk";
import fetch from "node-fetch";
// import { Validate } from "./recordJS";

const mongo = function() {
  const state = {
    baseUrl: `https://data.mongodb-api.com/app/${params('DB_ID')}/endpoint/data/v1/action/`
  };
  
  function buildDeleteManyOptions(collection, filter) {
    const options = { filter };
    
    return { collection, options };
  }
  
  function buildDeleteOneOptions(collection, id) {
    const filter = { _id: { $oid: id } },
    options = { filter };
    
    return { collection, options };
  }
  
  function buildFindOptions(collection, filter={}) {
    const options = {};
    
    const formats = {
      id: (value) => {
        filter._id = { $oid: value };
      },
      limit: (value) => {
        options.limit = Number(value);
      },
      skip: (value) => {
        options.skip = Number(value);
      },
      select: (value) => {
        if(!value) return;
        
        let projection = {};
        
        value.split(" ").forEach(selection => {
          const hideProp = selection.includes("-");
          
          selection = selection.replace("-", "");        
          projection[selection] = hideProp ? 0 : 1;
        });
        
        options.projection = projection;
      }
    };
    
    const formatFilter = (prop) => {
      if(prop in formats === "false") {
        return;
      }
      
      const currentValue = filter[prop],
      format = formats[prop];
      
      if(format) format(currentValue);
      delete filter[prop];
    };
    
    Object.keys(filter).forEach(formatFilter);
    
    options.filter = filter;
    
    return { collection, options };
  }
  
  function buildInsertOptions(collection, data) {
    const propName = Array.isArray(data) ? "documents" : "document";
    
    const options = { [propName]: data };
    
    return { collection, options };
  }
  
  function buildUpdateOneOptions(collection, id, body) {
    const filter = { _id: { $oid: id } },
    update = { $set: body };
    
    return { collection, filter, update };
  }
  
  async function exec(action, data, settings={}) {
    const response = await fetchData(action, data);
    
    if(settings.verbose) {
      // return detailed response
      return;
    }
    
    return returnOnlyDocuments(response);
  }
  
  async function fetchData(action, { collection, options }) {      
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
    
    const endpoint = state.baseUrl + action;
    
    const response = await fetch(endpoint, clientRequest);
    
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
      const data = buildDeleteOneOptions(collection, id);
      
      return await exec('deleteOne', data, settings);
    },
    
    async deleteMany(collection, filter, settings) {
      const data = buildDeleteManyOptions(collection, filter);
      
      return await exec('deleteMany', data, settings);
    },
    
    async find (collection, filter, settings) {
      const data = buildFindOptions(collection, filter);
      
      return await exec('find', data, settings);
    },
    
    async findOne(collection, filter, settings) {
      const data = buildFindOptions(collection, filter);
      
      return await exec('findOne', data, settings);
    },
    
    async insert (collection, item, settings) {
      await runSpecialfunction(collection);
      
      const data = buildInsertOptions(collection, item);
      const action = Array.isArray(item) ? 'insertMany' : 'insertOne';
      
      return await exec(action, data, settings);
    },
    
    async updateOne (collection, id, body, settings) {
      const data = buildUpdateOneOptions(collection, id, body);
      
      return await exec('updateOne', data, settings);
    },
    
    async updateMany (collection, options, settings) {
      if(options.filter || options.update) {
        throw error('Missing filter or update parameters');
      }
      
      return await exec('updateMany', { collection, options }, settings);
    }
    
  };
}();

export default mongo;