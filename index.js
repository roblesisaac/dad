import { http } from '@ampt/sdk';
import express from 'express';

import initApiRoutes from './api/routes';
import initEvents from './api/events';

import {
    passport, 
    rateLimiter,
    SessionStore, 
    uuidv4,
    xss
} from './api/middlewares';

initEvents();

const app = express();

app
    .use(SessionStore())
    .use(uuidv4)
    .use(rateLimiter)
    .use(xss())
    .use(passport.initialize())
    .use(passport.session())  
    .use(express.json());

initApiRoutes(app);
http.useNodeHandler(app);