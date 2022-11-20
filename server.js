
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);



// state manager eventemitter?



// --- routing -------------------------------------

console.log(`routing setup`, 'lifecycle', 'routing', 'keep');

app.get('/', (request, result) => 
{
    console.debug('root called', 'api', 'low');
    result.send('huloo');
});

// --- routing end ---------------------------------




const port = process.env.PORT || 8080;


server.listen(port, () => console.log(`listening on ${port}`, 'lifecycle', 'keep', 'server'));

module.exports = server;