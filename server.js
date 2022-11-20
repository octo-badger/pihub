
const http = require('http');
const express = require('express');
const { safe } = require('./lib/Extensions');

const app = express();
const server = http.createServer(app);

/** replaceable testing hook */
let getDebugLog = () => global.debugLog;

// state manager eventemitter?



// --- routing -------------------------------------

console.log(`routing setup`, 'lifecycle', 'routing', 'keep');

app.get('/', (request, result) => 
{
    console.debug('root called', 'api', 'low');
    result.send('huloo');
});

app.get('/log/:limit?', (request, result) => 
{
    let limit = safe(() => request.params.limit, Infinity);
    let tags = safe(() => request.query.tags, '');
    // can be moved to lib
    console.debug(`log called (${limit}, '${tags}')`, 'api');
    tags = tags.split('-')                                                                      // tag matches are hypen delimited
                .filter(tag => tag.length > 0)                                                      // empty strings need to be removed 
                    .map(tag => new RegExp(`\\b${tag}\\b`));                                            // convert tag matches to regex (if the string is empty, can't add word boundary anchors or it fails to match an empty string)

    let logs = getDebugLog();
    logs = logs.filter(log => tags.every(tag => tag.test(log.tags)));

    logs = logs.slice(Math.max(logs.length - limit, 0))

    result.send(logs);
});

// --- routing end ---------------------------------




const port = process.env.PORT || 8080;


server.listen(port, () => console.log(`listening on ${port}`, 'lifecycle', 'keep', 'server'));

module.exports = server;