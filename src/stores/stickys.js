// // can you build a class that works like this, where when i call api.greet it executes the array of steps in async
// const api = new Card(() => {
//     // steps
//     function sayHello() {
//         const { name, greeting } = this;
//         console.log(`Hi ${name}, ${greeting}`);
//     }
//     function concatLastName() {
//         console.log(this.name += 'robles');
//     }
//     function wait(seconds=2) {
//         setTimeout(next, seconds*1000);
//     }
//     function tellAJoke() {
//         console.log(this.name, 'heres a joke: knock knock');
//         next(this.name)
//     }
//     function sayFarewell() {
//         console.log(this.fareWell, this.fullName);
//     }
//     function sayThanks() {
//         console.log('thanks');
//     }

//     return {
//         state: {
//             greeting: 'welcome to our site',
//             farewell: 'farewell'
//         },
//         instruct: {
//             greet: (name) => [
//                 concatLastName,
//                 sayHello,
//                 wait(1),
//                 tellAJoke
//             ],
//             fareWell: [sayThanks, wait, sayFarewell]
//         }       
//     }
// });

// api.greet('joe').then((fullName) => {
//     api.fareWell(fullName);
// // })




// const api = Block(utils => {
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