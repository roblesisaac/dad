import { load } from 'recaptcha-v3';
import { router } from '../../main';

export default (state) => {
    const buildPayload = (method, body) => ({
        method,
        body: body ? JSON.stringify(body) : null,
        headers: {
          'Content-Type': 'application/json'
        }
    });

    const checkHuman = async ({ checkHuman: shouldCheckHuman }, body) => {
        if(!shouldCheckHuman) return;
        body.recaptchaToken = await fetchRecaptchaToken();
    };

    const fetchRecaptchaToken = async () => {
        const siteKey = import.meta.env.VITE_RECAPTCHA_KEY;
        const recaptcha = await load(siteKey);                       
        
        return await recaptcha.execute('login');
    };

    const getPathName = (url) => {
        if(!url) return;
        const sections = url.split('/');
        return sections[sections.length-1];
    }

    const handle = async (url, payload, settings) => {
        const response = await fetch(url, payload);

        const { redirected, url: redirectUrl } = response;

        if (redirected) {
            redirectPath(settings, getPathName(redirectUrl));
            return;
        }

        const json = await response.json();
        const { learn, redirect } = json || {};

        if(learn) {
            Object.assign(state.value, learn);
        }

        if(redirect) {
            redirectPath(settings, redirect);
            return;
        }
        
        return json;
    }

    const redirectPath = (settings, newLocation) => {
        if(!newLocation) {
            return;
        }

        if(settings?.reloadPage) {
            window.location = newLocation;
            return;
        }
        
        router.push(newLocation);
    }
    
    return {
        get: async (url, settings) => {
            const payload = buildPayload('GET');
            return handle(url, payload, settings);
        },
        put: async (url, body, settings) => {
            const payload = buildPayload('PUT', body);
            await checkHuman(settings, body);
            return handle(url, payload, settings);            
        },
        post: async (url, body, settings) => {
            const payload = buildPayload('POST', body);
            await checkHuman(settings, body);
            return handle(url, payload, settings);
        },
        delete: async (url, settings) => {
            const payload = buildPayload('DELETE');
            return handle(url, payload, settings);
        }
    };
};