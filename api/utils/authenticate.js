import { Aid } from "./aidkit";
import mongo from "./mongo.js";

export default new Aid({
  steps: {
    fetchPermitForUser: function(res, next) {
      const filter = this.user;

      mongo.findOne("users", filter).then(next);
    }
  },
  instruct: {
    user: (user) => [
      "fetchPermitForUser",
      // mongo.findOne_("permits", "user"),
      { log: "_output" }
    ]
  }
});