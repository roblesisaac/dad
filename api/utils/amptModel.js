import { data } from "@ampt/data";

class AmptModel {
  constructor(collectionName, schema) {
    this.collectionName = collectionName;
    this.schema = schema;
  }

  async create(item, labels = {}) {
    const validatedItem = this.validate(item);
    const key = await this.generateKey(validatedItem);
    const generatedLabels = this.generateLabels(validatedItem, labels);
    // await data.set(key, validatedItem, generatedLabels);

    console.log({ key, validatedItem, generatedLabels });
    return validatedItem;
  }

  async getByKey(key) {
    return await data.get(`${this.collectionName}:${key}`);
  }

  async getByLabel(label, value) {
    return await data.getByLabel(label, value);
  }

  validate(item, schema = this.schema) {
    const validatedItem = {};

    for (const [key, schemaItem] of Object.entries(schema)) {
      const value = item[key];

      if (schemaItem.required && value === undefined) {
        throw new Error(`Missing required field: ${key}`);
      }

      if (value === undefined && schemaItem.default !== undefined) {
        validatedItem[key] = schemaItem.default;
      } else if (schemaItem.type === 'object' && value !== undefined) {
        validatedItem[key] = this.validate(value, schemaItem.properties);
      } else if (schemaItem.type === 'array' && value !== undefined) {
        validatedItem[key] = value.map(item => this.validate(item, schemaItem.items));
      } else {
        validatedItem[key] = value;
      }

      if (schemaItem.lowercase && typeof validatedItem[key] === "string") {
        validatedItem[key] = validatedItem[key].toLowerCase();
      }
    }

    return validatedItem;
  }

  async generateKey(item) {
    // for (const [key, schemaItem] of Object.entries(this.schema)) {
    //   if (schemaItem.unique) {
    //     const existingItem = await data.getByLabel(`${this.collectionName}:${key}`, item[key]);
    //     if (existingItem.length > 0) {
    //       throw new Error(`Unique constraint violation: ${key}`);
    //     }
    //   }
    // }

    // Customize this function to generate a unique key based on the item properties
    return `${this.collectionName}:${item.id}`;
  }

  generateLabels(item, labelsConfig) {
    const labels = {};

    for (const [labelKey, labelConfig] of Object.entries(labelsConfig)) {
      const labelValue = labelConfig.value(item);
      labels[labelKey] = `${this.collectionName}:${labelConfig.name}:${labelValue}`;
    }

    return labels;
  }
}

// async function test() {
//   const userSchema = {
//     id: { required: true, unique: true },
//     name: { required: true },
//     email: { required: true, lowercase: true, unique: true },
//     title: { required: false, lowercase: true, },
//     address: {
//       type: 'object',
//       properties: {
//         street: { required: true },
//         city: { required: true },
//         country: { required: true },
//       },
//     },
//     friends: {
//       type: 'array',
//       items: {
//         type: 'object',
//         properties: {
//           id: { required: true, unique: true },
//           name: { required: true },
//         },
//       },
//     },
//   };

//   const labelConfig = {
//       label1: {
//           name: 'email',
//           value: (document) => document.email,
//       },
//   };

//   const UserModel = new AmptModel('users', userSchema);

//   const user = {
//   id: "123",
//   name: "John Doe",
//   email: "john.doe@example.com",
//   title: "Senior Developer",
//   address: {
//       street: "123 Main St",
//       city: "New York",
//       country: "USA",
//   },
//   friends: [
//       { id: "1", name: "Alice" },
//       { id: "2", name: "Bob" },
//   ],
//   };

//   const newUser = await UserModel.create(user, labelConfig);
//   console.log({ newUser });

//   // const retrievedUser = await UserModel.getByKey("123");
//   // console.log({retrievedUser});

//   // const users = await UserModel.getByLabel("label1", "users:email:john.doe@example.com");
//   // console.log({users});

//   res.json('testing model...');
// }

export default AmptModel;