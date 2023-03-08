

// const { spawn } = require('child_process');

// let stdio = 'inherit';

// // special handling for windows
// if (/^win/i.test(process.platform)) 
// {
//     const fs = require('fs');
//     console.debug('detected windows');
//     const out = fs.openSync('./tmp/navi.log', 'a');
//     const err = fs.openSync('./tmp/navi.log', 'a');
//     stdio =  [ 'ignore', out, err ]
// }

// const subprocess = spawn('node', ['./lib/Navi.js'], { 
//   detached: true,
//   stdio: stdio
// });

// subprocess.unref();                                             // allows the parent to exit (windows also needs the stdio / ipc to not be connected, linux (and mac) doesn't care)

const navi = require('../lib/Navi');
const http = require('http');

navi.wake(__filename);
const port = 3230;

function spinUpServer()
{
    console.log(`${port}: creating server`);
    const httpServer = http.createServer((request, response) => 
    {
        console.log(`${port}: received ${request.url}`);
        if(request.url === '/kill') 
        {
            console.log(`${port}: quitting`);
            process.exit(0);
        }
        else if(request.url === '/navi')
        {
            response.setHeader('Content-Type', 'text/plain');                           // Set the 'Content-Type' in response header
            response.writeHead(200);
            response.end(`alive ${process.pid}`);
        }
        else
        {
            response.writeHead(204);
            response.end();
        }
    });

    httpServer.on('error', (e) => 
    {
        if (e.code === 'EADDRINUSE') 
        {
            console.log(`!!! another instance already listening on ${port} - quitting, goodbye`);
            process.exit(0);
        }
        console.error(`${port}: httpServer error: `, e);
    });


    console.log(`${port}: trying listen`);
    httpServer.listen(port, () => 
    {
        console.log(`\x1b[32mServer is running at http://127.0.0.1:${port}\x1b[0m`);
    });
}
spinUpServer();

let count = 3;

function go()
{
    setTimeout(() =>
    {
        console.log(`${port}: parent ${count}`);
        if(count-- > 0) go();
    },
    1000);
}
 
go();