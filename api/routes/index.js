import { http } from '@ampt/sdk';
import { Router } from 'express';

import address from './address';
import dataApi from './data';
import db from './db';
import users from './users';

export default (app) => {
    const api = Router();      

    [
        address, 
        db,
        users,
        dataApi
    ].forEach(route => route(api, '/api'));

    // Serve index.html on all 404s
    api.use(async (_, res) => {
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