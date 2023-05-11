import { events } from '@ampt/sdk';

import { userEvents } from './users';

export default () => {
    userEvents(events);
}