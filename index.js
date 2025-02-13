import { http } from '@ampt/sdk';
import express from 'express';

import initApiRoutes from './api/routes';
import initEvents from './api/events';

import {
    xss
} from './api/middlewares';

initEvents();

const app = express();

app
    .use(xss())
    .use(express.json());

initApiRoutes(app);
http.useNodeHandler(app);