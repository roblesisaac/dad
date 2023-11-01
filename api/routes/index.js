import { http } from '@ampt/sdk';
import { Router } from 'express';

import address from './address';
import auth from './auth';
// import db from './db';
import groups from './groups';
import mongo from './mongo';
import messages from './messages';
import pages from './pages';
import plaid from './plaid';
import rules from './rules';
import sites from './sites';
import tabs from './tabs';
import users from './users';

export default (app) => {
    const api = Router();

    // Api startpoint
    api.get('/api', (_, res) => {
        res.json(`You've reached the starting point of our API!`);
    });

    // Api routes
    [
        address,
        auth,
        groups,
        mongo,
        messages,
        sites,
        pages,
        plaid,
        rules,
        tabs,
        users,
        // db
    ].forEach(route => route(api, '/api'));

    // Api catch all
    api.get('/api/*', (req, res) => {
        res.json(`Collection named '${req.params[0]}' not found`);
    });

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