import { load } from 'recaptcha-v3';
import { Aid } from '../../../api/utils/aidkit';
import { router } from '../../main';

export default state => new Aid({
    steps: {
        async handler(method, url, body) {
            const payload = {
                method,
                headers: {
                  'Content-Type': 'application/json'
                }
            };

            const { checkHuman } = this.settings || {};

            const { handleError } = this;
            
            if(body) {
                if(checkHuman) {
                    const siteKey = import.meta.env.VITE_RECAPTCHA_KEY;
                    const recaptcha = await load(siteKey);                       body.recaptchaToken = await recaptcha.execute('login');
                }

                payload.body = JSON.stringify(body);
            }

            fetch(url, payload)
                .then(this.next).catch(handleError);
        },
        async handleResponse(response) {
            const { settings, next } = this;
            const { freshRedirect } = settings || {}
            const { redirected, url } = response;

            const redirectPath = path => freshRedirect 
                ? window.location = path 
                : router.push(path);

            if (redirected) {
                if(!url) return;

                const sections = url.split('/');
                const path = sections[sections.length-1];

                return redirectPath(path);
            }

            const json = await response.json();

            const { learn, redirect } = json;

            if(learn) {
                Object.assign(state.value, learn);
            }

            if(redirect) {
                return redirectPath(redirect);
            }
            
            next(json);
        }
    },
    instruct: {
        get: (url, settings) => [
            { settings },
            { handler: ['GET', url] },
            'handleResponse'
        ],
        put: (url, body, settings) => [
            { settings },
            { handler: ['PUT', url, body] },
            'handleResponse'
        ],
        post: (url, body, settings) => [
            { settings },
            { handler: ['POST', url, body] },
            'handleResponse'
        ],
        delete: (url, settings) => [
            { settings },
            { handler: ['DELETE', url] },
            'handleResponse'
        ]
    }
});