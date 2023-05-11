import { Router } from 'express';

import address from './address';
import dataApi from './data';
import users from './users';

export default (app) => {
    const api = Router();      

    const routes = [
        address, 
        dataApi, 
        users
    ];
      
    routes.forEach(route => route(api, '/:collection'));

    app.use('/', api);
};