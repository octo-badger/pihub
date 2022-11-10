
const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

function timestamp()
{
    let d = new Date();
    return `${d.getFullYear()}${d.getMonth()}${d.getMonth()}-${d.toLocaleTimeString('default', timeOptions)}.` + `${d.getMilliseconds()}`.padStart(3, '0');
}

//*
// subvert the console
(function()
{
    let { log, debug, error } = global.console;
    global.console.log = (msg) => log(`log ${timestamp()}: ${msg}`);
    // global.console.debug = (msg) => debug(`dbg ${timestamp()}: ${msg}`);
    global.console.debug = () => {};
    // global.console.error = (msg) => 
    // {
    //     if(msg instanceof Error) console.log('is Error');
    //     if(msg.message) 
    //     {
    //         log(`has message: ${msg.message}`);
    //         log(`stack: ${msg.stack}`);
    //         log(`stackTraceLimit: ${Error.stackTraceLimit}`);
    //         msg.message = `err ${timestamp()}: ${msg.message}`;
    //         error(msg.message);
    //         error(msg.stack)
    //     }
    //     else
    //         error(msg);     
    // };
})()
//*/

//console.log(`stl: ${Error.stackTraceLimit}`);

const server = require('./server');
const socketio = require('socket.io');
const io = socketio(server);

const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

const sunstatus = require('./sunStatus')
const StatusValue = require('./lib/StatusValue');
const Settings = require('./lib/Settings');

const settings = new Settings(
                { 
                    defaultData:
                    {
                        pins: 
                        {
                            doorLightR: 26,
                            doorLightG: 6,
                            doorLightB: 5
                        },
                        lightOptions: 
                        {
                            maxChangePerSec: 200, 
                            acc: 5, 
                            clamp: { lower: 0, upper: 255},
                            round: true
                        },
                        green: { maxChangePerSec: 99999, stepMillis: 10 },
                        //blue: { maxChangePerSec: Infinity, acc: 1, stepMillis: 50 }
                        blue: { maxChangePerSec: 99999, acc: 1, stepMillis: 50 }
                    }
                });

                
function merge(base, mods)
{
    return Object.assign({}, base, mods);
}

let config = null;
let isConnected = false; 
let isDoorClosed = false; 

async function go()
{
    config = await settings.load('config.json');
    console.log(`sunstatus: ${JSON.stringify(await sunstatus.getData())}`);

    let pins = config.pins;

    /*
    const doorLightR = new Gpio(pins.doorLightR, { mode: Gpio.OUTPUT });
    const doorLightG = new Gpio(pins.doorLightG, { mode: Gpio.OUTPUT });
    const doorLightB = new Gpio(pins.doorLightB, { mode: Gpio.OUTPUT });
    /*/
    const [doorLightR, doorLightG, doorLightB] = ['R','G','B'].map(c => new Gpio(pins['doorLight'+c], { mode: Gpio.OUTPUT }));
    //*/

    //let start = Date.now();

    //let easeB = new DynamicEase(0, Object.assign({}, lightOptions, {maxChangePerSec: Infinity, acc: 1, stepMillis: 50}),
    let redOptions = config.lightOptions;
    let grnOptions = merge(config.lightOptions, config.green);
    let bluOptions = merge(config.lightOptions, config.blue);

    let easeB = new StatusValue(0, bluOptions,
                    {
                        onUpdate: pwm => 
                        {   
                            //console.log(`${Date.now() - start}, ${pwm}`);
                            doorLightB.pwmWrite(pwm);
                        }
                    });

    let easeG = new StatusValue(0, grnOptions,
                    {
                        onUpdate: pwm => 
                        {   
                            //console.log(`${Date.now() - start}, ${pwm}`);
                            doorLightG.pwmWrite(pwm);
                        }
                    });
    

    let easeR = new StatusValue(0, redOptions,
        {
            onUpdate: pwm => doorLightR.pwmWrite(pwm),
        });


    let updateState = () =>
    {
        console.debug(`setting door closed: ${isDoorClosed}`);
        //easeR.set(isDoorClosed ? 0 : 255);
        isDoorClosed ? easeR.pause(0) : easeR.resume();

        console.debug(`setting connected: ${isConnected}`);
        //easeG.set(isConnected ? 0 : 255);
        isConnected ? easeG.pause(0) : easeG.resume();
    };


    io.on('connection', (socket) =>
    {
        console.log('websocket connection');
        isConnected = true;
        updateState();

        socket.on("disconnecting", (reason) => 
        {
            console.log(`disconnected: ${reason}`);
            isDoorClosed = isConnected = false;
            updateState();
        }); 

        socket.on('door', (msg) => 
        {
            console.log(`door ${msg}`);
            isDoorClosed = (msg === 'closed');
            updateState();
        });
    });


    // socket.on('test', (msg) => console.log(`test: ${msg}`));

    // socket.onAny((eventName, ...args) => {
    //     console.log(`any : ${eventName} :: ${args.length}`);
    // });
}
go();




// --- process handling ----------------------------------------------------------------


process.on('SIGINT', () => 
{
    console.log('received SIGINT');
    process.exit();
});

process.on('SIGTERM', () =>
{
    console.log('received SIGTERM');
    process.exit();
});

process.on('uncaughtException', (error) => 
{
    console.log("An uncaught exception has occured");
    console.error(error);
    process.exit(1);
});

process.on('exit', (code) => 
{
    doorLightR.pwmWrite(0);
    doorLightG.pwmWrite(0);
    doorLightB.pwmWrite(0);
    pigpio.terminate();
    console.log(`\nExiting with code: ${code}`);
});
