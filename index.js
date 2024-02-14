import { http } from '@ampt/sdk';
import express from 'express';

import initApiRoutes from './api/routes';
import initEvents from './api/events';

import {
    SessionStore,
    uuidv4,
    xss,
    passport
} from './api/middlewares';

initEvents();

const app = express();

app
    .use(SessionStore())
    .use(uuidv4)
    .use(xss())
    .use(passport.initialize())
    .use(passport.session())
    .use(express.json());

initApiRoutes(app);
http.useNodeHandler(app);