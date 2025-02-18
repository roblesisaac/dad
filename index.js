import { http } from '@ampt/sdk';
import express from 'express';

import initApiRoutes from './api/routes';

import {
    xss
} from './api/middlewares';

const app = express();

app
    .use(xss())
    .use(express.json());

initApiRoutes(app);
http.useNodeHandler(app);