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

    const checkHuman = async ({ checkHuman }, body) => {
        if(!checkHuman) return;
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

        return await handleResponse(response, settings);
    }

    const handleResponse = async (response, settings) => {
        const { redirected, url } = response;

        if (redirected) {
            redirectPath(settings, getPathName(url));
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
    };

    const redirectPath = (settings, path) => {
        if(!path) {
            return;
        }

        if(settings?.reloadPage) {
            window.location = path;
            return;
        }
        
        router.push(path);
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