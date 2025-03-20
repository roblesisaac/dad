import { http } from '@ampt/sdk';
import express from 'express';

import initApiRoutes from './api/routes';

const app = express();

app
    .use(express.json());

initApiRoutes(app);
http.useNodeHandler(app);