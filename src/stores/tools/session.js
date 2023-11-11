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

  function onLoginPage() {
    return window.location.pathname === '/login';
  }

  async function watchSession() {
    if(!session.watchingSession) {
      await touch();
    }

    session.watchingSession = true;

    const secondsUntilLogout = getSecondsUntilLogout();

    if(secondsUntilLogout > 0 && secondsUntilLogout < 5) {
      State.showStayLoggedInForm = true;
    }

    if(secondsUntilLogout <= 0 && !onLoginPage()) {
      State.showStayLoggedInForm = false;
      State.showLoginForm = true;
      session.isLoggedIn = false;
    }

    setTimeout(watchSession, 2000);
  }

  State.session = session;

  return {
    logBackIn: async () => {

    },
    touch,
    watchSession
  }
}

function convertToReadableTimeWithSeconds(utcTimestamp) {
  // Convert the UTC timestamp to a Date object
  const date = new Date(utcTimestamp);

  // Adjust to Pacific Time (PST/PDT)
  const pacificTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  // Format the time as hh:mm:ss AM/PM
  const options = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
    timeZoneName: 'short',
  };

  return pacificTime.toLocaleTimeString('en-US', options);
}