// class Card {
//   constructor(stepsFn) {
//     const { state, instruct } = stepsFn.call(this);

//     this.state = state;

//     for (const methodName in instruct) {
//       this[methodName] = async (...args) => {
//         const steps = typeof instruct[methodName] === 'function'
//           ? instruct[methodName](...args)
//           : instruct[methodName];
//         for (const step of steps) {
//           await step.call(this);
//         }
//       };
//     }
//   }
// }
  
// const api = new Card(function () {
//   // steps
//   function sayHello() {
//     const { name, greeting } = this;
//     console.log(`Hi ${name}, ${greeting}`);
//   }
//   function concatLastName() {
//     console.log((this.name += 'robles'));
//   }
//   function wait(seconds = 2) {
//     return new Promise((resolve) => {
//       setTimeout(resolve, seconds * 1000);
//     });
//   }
//   function tellAJoke() {
//     console.log(this.name, 'heres a joke: knock knock');
//   }
//   function sayFarewell() {
//     const { farewellMessage, fullName } = this;
//     console.log(farewellMessage, fullName);
//   }
//   function sayThanks() {
//     console.log('thanks');
//   }
  
//   return {
//     state: {
//       greeting: 'welcome to our site',
//       farewellMessage: 'farewell',
//     },
//     instruct: {
//       greet: (name) => [
//         concatLastName,
//         sayHello,
//         () => wait(1),
//         tellAJoke,
//       ],
//       fareWell: [sayThanks, wait, sayFarewell],
//     },
//   };
// });
  
// api.greet('joe').then(() => {
//   api.fareWell('Joe Robles');
// });

// const blockApi = Block(utils => {
//     const { every, wait, next, condition } = utils

//     const sayHi = () => {
//         console.log(this.name);
//     };

//     const isAdmin = () => {
//         next(this.item === 'admin');
//     }

//     const grantAccess = () => {

//     }

//     const redirect = () => {}

//     return {
//         state: {
//             name: 'isaac'
//         },
//         instruct: () => [
//             sayHi,
//             every('_output', [
//                 log('item'),
//                 sayHi,
//                 wait(1),
//                 condition(isAdmin, {
//                     true: [
//                         sayHi,
//                         grantAccess
//                     ],
//                     false: [
//                         sayBye,
//                         redirect
//                     ]
//                 })
//             ]),
//             {
//                 every: '_output',
//                 run: [{ log: 'item' }]
//             }
//         ]
//     }
// });

// function Block(build) {
//     const utils = {
//         every
//     }

//     build({
//         every
//     });
// }



const api = function() {
  const data = {
    baseUrl: 'www.',
    url: ''
  };
  const state = {
    carUrls: [],
    fetchCount: 0,
    history: []
  };
  function buildUrl(url) {
    const { baseUrl } = data;
    data.url = baseUrl + url;
    console.log('buildingUrl', data.url);
  }
  function delay(ms=1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  function incr() {
    state.fetchCount++;
  }
  function remember() {
    state.history.push(data.url);
  }
  async function fetchCars() {
    console.log('fetching cars...');
    await delay(1000);
    data.cars = ['honda', 'chevy', 'ford'];
  }
  function buildCarUrl(car) {
    data.carUrl = `www.${car}.com`;
    console.log('built carurl', data.carUrl);
  }
  function storeCarUrl({ carUrl }) {
    state.carUrls.push(carUrl);
    console.log('stored', carUrl);
  }
  function buyStuffForCar(car) {
    console.log('bought stuff for', car);
  }

  return {
    state,
    get: async (url) => {
      buildUrl(url);
      console.log('last', data.url);
      await fetchCars();
      for (const car of data.cars) {
        buildCarUrl(car);
        storeCarUrl(data);
        buyStuffForCar(car);
        await delay(2000);
      }
      incr();
      remember();
      // console.log(this); logs Window
      if(state.fetchCount < 2) api.get('yahoo');
    }
  }
}()

api.get('google');

const record = function() {
  const data = {
    validated: {},
    metadata: {}
  };

  return {
    validate: async (colllectionName, schema, body) => {
      for(const key in schema) {
        const schemaKeyType = schema[key].value || schema[key];
        const bodyHasKey = body.hasOwnProperty(key);

        if(isMeta(key)) {
          metadata[key] = schema[key];
          continue;
        }

        if(isUnique(schema[key])) {
          handleUnique(schema, body, key);
          continue;
        }

        if(isWild(schemaKeyType)) {
          validated[key] = body[key];
          continue;
        }

        if(isMissingRequiredField(schema[key])) {
          err(`Missing required property ${key}.`);
        }

        if (needsDefault(schema[key])) {
          validated[key] = schema[key].default;
          continue;
        }

        if(Array.isArray(schemaKeyType)) {
          // record.validate ??
        }
      }
    }
  }
}();