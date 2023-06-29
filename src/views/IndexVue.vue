<template>
  <div class="grid">
    <div class="cell-md-1-2">
      <h1>Alohas</h1>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p id="vanP">
        <img alt="Vue logo" id="van" src="../assets/icon.svg" height="100" />
      </p>
      <p v-for="car in cars" v-bind:key="car._id">
        {{  car.year }}-{{  car.make }}-{{  car.model }}
      </p>
      <br />
      <input type="text" placeholder="year" v-model="car.year" />
      <br />
      <input type="text" placeholder="make" v-model="car.make" />
      <br />
      <input type="text" placeholder="model" v-model="car.model" />
      <br />
      <input type="text" placeholder="submodel" v-model="car.submodel" />
      <br />
      <input type="text" placeholder="engine" v-model="car.engine" />
      <br />
      <button @click="addCar(car)">Add Car</button>
      <p>
        The information below is being fetched from your Serverless Cloud API:
      </p>
      <button id="addUser" @click="addUser">Add A User</button>
      <div v-if="loading">Loading users...</div>
      <div v-else-if="users.length == 0"><strong>No users found</strong></div>
      <div v-else-if="users.message">{{  users.message }}</div>
      <div v-else id="users">
        <div v-for="user in users" v-bind:key="user.id">
          <strong>{{ user.name }}: </strong>
          <span :class="user.status">{{ user.status }}</span>
        </div>
      </div>
    </div>
    <div class="cell-md-1-2">
      <p>
        Open YOUR terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <div>sticky.stuck.height</div>
      <div id="header"><b>Header</b></div>
      <h3>Edit this Vue.js app:</h3>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
      <p>
        Open your terminal to the project directory and run <code>npm i</code> to
        install the Vue.js dependencies. Then run <code>cloud dev</code> to launch
        the local Vue.js dev server. You can access the API on your personal
        developer sandbox by appending <code>/api</code> to the local dev server's
        localhost address.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '../stores/app';

const { api, sticky } = useAppStore();

const loading = ref(true);
const users = ref([]);
const stickys = [
  // '#van', '#addUser', '#header'
  { 
    selector: '#van',
    stickUnder: '.topNav',
    screenSize: '-medium',
    unstickWhen: {
      isSticky: '#addUser'
    }
  },
  {
    selector: '#addUser',
    stickUnder: '.topNav',
    small: {
      unstickWhen: {
        isSticky: '#header'
      }
    }
  },
  {
    selector: '#header',
    small: {
      stickUnder: '.topNav'
    }
  }
];

const emptyCar = () => ({  
  year: '',
  make: '',
  model: '',
  submodel: ''
});

const cars = ref([]);
const car = ref(emptyCar());

onMounted(async () => {
  sticky.stickify(stickys);

  users.value = await api.get('/db/users');
  loading.value = false;
});

onUnmounted(() => {
  sticky.unstickAll();
});

function addUser() {
  const anotherUser = {
    name: 'joe'+users.value.length,
    status: "active" 
  };

  let usrs = [];

  for(var i=0; i<=100; i++) usrs.push(anotherUser)

  users.value = users.value.concat(usrs);
}
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
a {
  color: #fe5750;
}

#users {
  margin: 0 auto;
}

.active {
  color: #42b983;
}
.inactive {
  color: #fe5750;
}

p {
  max-width: 600px;
  margin: 1em auto;
}

code {
  background: #f1f1f1;
  padding: 0.2em;
  color: #fe5750;
}
</style>