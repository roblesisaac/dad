const app = function() {
  const state = {
    isLoggedIn: false
  };

  async function checkLoggedIn() {
    const response = await fetch('api/login/check/auth');
    const json = await response.json();

    state.isLoggedIn = json.isLoggedIn;
  }

  return {
    state,
    init: async() => {
      await checkLoggedIn();
    }
  }
}();

app.init();

export default app;