
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);



// state manager eventemitter?



// --- routing -------------------------------------

app.get('/', (request, result) => 
{
    result.send('huloo');
});

// --- routing end ---------------------------------


const port = process.env.PORT || 8080;


server.listen(port, () => console.log(`listening on ${port}`));

module.exports = server;