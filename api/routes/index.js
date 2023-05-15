import { http } from '@ampt/sdk';
import { Router } from 'express';

import address from './address';
import dataApi from './data';
import users from './users';

export default (app) => {
    const api = Router();      

    [
        address, 
        dataApi, 
        users
    ].forEach(route => route(api, '/:collection'));

    api.use(async (req, res) => {
        const stream = await http.readStaticFile('index.html');
        const decoder = new TextDecoder('utf-8');
        let htmlContent = '';
      
        for await (const chunk of stream) {
          const decodedChunk = decoder.decode(chunk, { stream: true });
          htmlContent += decodedChunk;
        }
      
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    });

    app.use('/', api);
};