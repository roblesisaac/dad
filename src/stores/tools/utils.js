import { router } from '../../main';
import { load } from 'recaptcha-v3';

export default function(State) {
  function defineNewPath(link) {
    return link?.path || link;
  }
  function hideRecaptchaBadgeClass() {
    document.body.classList.add('hide-recaptcha-badge');
  }
  function showRecaptchaBadgeClass() {
    document.body.classList.remove('hide-recaptcha-badge');
  }

  return {
    changePath(link) {
      hideRecaptchaBadgeClass();
      const newPath = defineNewPath(link);

      router.push(newPath);
    },
    async initRecaptcha() {
      showRecaptchaBadgeClass();

      if(State.recaptcha) return;
      
      const siteKey = import.meta.env.VITE_RECAPTCHA_KEY;
      State.recaptcha = await load(siteKey);
    }
  }
};