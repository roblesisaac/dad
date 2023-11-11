export default function(State) {
  const session = {
    expires: null,
    isLoggedIn: false,
    watchingSession: false
  };

  async function touch() {
    const response = await fetch('api/login/check/auth');
    const json = await response.json();

    session.isLoggedIn = json.isLoggedIn;
    session.expires = json.expires;

    if(session.isLoggedIn) {
      State.showStayLoggedInForm = false;
      State.showLoginForm = false;
    }
  }

  function getSecondsUntilLogout() {
    if(!session.isLoggedIn) {
      return 0;
    };

    const logoutTime = new Date(session.expires).getTime();
    const msUntilLogout = logoutTime - Date.now();
    const seconds = msUntilLogout/1000;

    return seconds;
  }

  function isOnLoginPage() {
    return window.location.pathname === '/login' || window.location.pathname === '/';
  }

  async function watchSession() {
    if(!session.watchingSession) {
      await touch();
    }

    session.watchingSession = true;

    const secondsUntilLogout = getSecondsUntilLogout();

    if(secondsUntilLogout > 0 && secondsUntilLogout < 60) {
      State.showStayLoggedInForm = true;
    }

    if(secondsUntilLogout <= 0 && !isOnLoginPage()) {
      State.showStayLoggedInForm = false;
      State.showLoginForm = true;
      session.isLoggedIn = false;
    }

    setTimeout(watchSession, 2000);
  }

  State.session = session;

  return {
    touch,
    watchSession
  }
}