import { router } from '../../main';
import { useAppStore } from '../app';

export default function(State) {
  async function buildPayload(method, body) {
    return {
      method,
      body: body ? JSON.stringify(body) : null,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
  
  async function checkHuman({ checkHuman: shouldCheckHuman }, body) {
    if (!shouldCheckHuman) return;

    const { utils } = useAppStore();
    await utils.initRecaptcha();

    body.recaptchaToken = await State.recaptcha.execute('login');
  }
  
  function getPathName(url) {
    if (!url) return;
    const sections = url.split('/');
    return sections[sections.length - 1];
  }
  
  async function handle(url, payload, settings) {
    const response = await fetch(url, payload);
    const { redirected, url: redirectUrl } = response;
    
    if (redirected) {
      redirectPath(settings, getPathName(redirectUrl));
      return;
    }
    
    const json = await response.json();
    const { learn, redirect } = json || {};
    
    if (learn) {
      Object.assign(State, learn);
    }
    
    if (redirect) {
      redirectPath(settings, redirect);
      return;
    }
    
    return json;
  }
  
  function redirectPath(settings, newLocation) {
    if (!newLocation) {
      return;
    }
    
    if (settings?.reloadPage) {
      window.location = newLocation;
      return;
    }
    
    router.push(newLocation);
  }
  
  return {
    get: async function(url, settings={}) {
      const payload = await buildPayload('GET');
      return handle(url, payload, settings);
    },
    put: async function(url, body, settings={}) {
      await checkHuman(settings, body);
      const payload = await buildPayload('PUT', body);
      return handle(url, payload, settings);
    },
    post: async function(url, body, settings={}) {
      await checkHuman(settings, body);
      const payload = await buildPayload('POST', body);
      return handle(url, payload, settings);
    },
    delete: async function(url, settings={}) {
      const payload = await buildPayload('DELETE');
      return handle(url, payload, settings);
    }
  };
}
