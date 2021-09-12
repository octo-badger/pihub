
const sunstatus = require('./sunStatus')
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
//const Gpio = require('pigpio').Gpio;
const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

//const DynamicEase = require('./lib/DynamicEase').DynamicEase;
const DynamicEase = require('./lib/DynamicEase');
const Settings = require('./lib/Settings');
const settings = new Settings();

async function go()
{
    let config = await settings.load('config.json');
    console.log(`sunstatus: ${JSON.stringify(await sunstatus.getData())}`);
}
go();


const app = express();
const server = http.createServer(app);
const io = socketio(server);

let pins = {
    doorLightR: 26,
    doorLightG: 6,
    doorLightB: 5
};

let lightOptions = 
{
    maxChangePerSec: 200, 
    acc: 5, 
    clamp: { lower: 0, upper: 255},
    round: true
};

const doorLightR = new Gpio(pins.doorLightR, { mode: Gpio.OUTPUT });
const doorLightG = new Gpio(pins.doorLightG, { mode: Gpio.OUTPUT });
const doorLightB = new Gpio(pins.doorLightB, { mode: Gpio.OUTPUT });

let start = Date.now();

let easeB = new DynamicEase(0, Object.assign({}, lightOptions, {maxChangePerSec: Infinity, acc: 1, stepMillis: 50}),
    {
        onUpdate: pwm => 
        {   
            //console.log(`${Date.now() - start}, ${pwm}`);
            doorLightB.pwmWrite(pwm);
        },
        onComplete: ease => 
        {
            //console.log(`completed: ${ease.target}`);
            ease.set(ease.target === 0 ? 128 : 0);
        }
    });

// --- routing -------------------------------------

app.get('/', (request, result) => 
{
    result.send('huloo');
});

// --- routing end ---------------------------------

const port = process.env.PORT || 8080;


io.on('connection', (socket) =>
{
    console.log('websocket connection');
    socket.on("disconnecting", (reason) => console.log(`disconnected: ${reason}`)); 

    let easeR = new DynamicEase(0, lightOptions,
        {
            onUpdate: pwm => doorLightR.pwmWrite(pwm),
            onComplete: null //() => console.log(`completed`)
        });

    socket.on('test', (msg) => 
    {
        console.log(`test: ${msg}`);
        easeR.set(msg === 'door open' ? 255 : 0);
    });
});


// socket.on('test', (msg) => console.log(`test: ${msg}`));

// socket.onAny((eventName, ...args) => {
//     console.log(`any : ${eventName} :: ${args.length}`);
// });

server.listen(port, () => console.log(`listening on ${port}`));




// --- process handling ----------------------------------------------------------------

process.on('SIGINT', () => 
{
    console.log('received SIGTERM');
    process.exit();
});

process.on('SIGTERM', () =>
{
    console.log('received SIGTERM');
    process.exit();
});

process.on('exit', (code) => 
{
    doorLightR.pwmWrite(0);
    doorLightG.pwmWrite(0);
    doorLightB.pwmWrite(0);
    pigpio.terminate();
    console.log(`\nExiting with code: ${code}`);
});
