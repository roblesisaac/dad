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
import transactions from './transactions';
import users from './users';

export default (app) => {
    const api = Router();

    // Api startpoint
    api.get('/api', (_, res) => {
        res.json(`You've reached the starting point of TrackTabs API!`);
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
        transactions,
        users,
        // db
    ].forEach(route => route(api, '/api'));

    // Api catch all
    api.get('/api/*', (req, res) => {
        res.json(`Collection named '${req.params[0]}' not found`);
    });

    // Serve index.html on 404s
    api.use(async (req, res) => {
        if (req.accepts('html')) {
            const stream = await http.node.readStaticFile('index.html');
            res.status(200).type('html');
            stream.pipe(res);
            return;
        }
        
        if (req.accepts('json')) {
            return res.status(404).json({ message: 'Not found' });
        }
        
        if (req.accepts('txt')) {
            return res.status(404).type('txt').send('Not found')
        }

        res.status(404).end()
    });

    app.use('/', api);
};