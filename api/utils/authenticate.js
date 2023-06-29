import mongo from "./mongo.js";

const auth = function() {
  return {
    user: (user) => {
      //fetchPermitForUser();
      //mongo.findOne('permits', 'user');

    }
  }
}();

export default auth;