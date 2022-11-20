
const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

function timestamp()
{
    let d = new Date();
    return `${d.getFullYear()}${d.getMonth()}${d.getMonth()}-${d.toLocaleTimeString('default', timeOptions)}.` + `${d.getMilliseconds()}`.padStart(3, '0');
}


global.debugLog = [];


const logSize = 120;
let log3rd = Math.floor(logSize / 3);


//*
// subvert the console
(function()
{
    let persist = (logEntry, tags) => setTimeout(() => 
    {
        debugLog.push({ log: logEntry, tags: tags.join('-')});
        
        // let logWindow = debugLog.slice(windowSize);
        let windowSize = log3rd + Math.ceil(Math.random() * log3rd);

        for(let i=5; debugLog.length > logSize && i>0; i--)            // (only might remove >1 if log fills with 'keeps' - probably not worth it, but...) while debugLog has more than N entries, up to a maximum of 5 times
        {
            /*
            let iy = logWindow.findIndex(log => /\blow\b/.test(log.tags));
            if(iy < 0) iy = logWindow.findIndex(log => !/\bkeep\b/.test(log.tags));
            
            if(iy >= 0) 
            {
                logWindow.splice(iy, 1);
                let ix = iy;
                debugLog.splice(ix, 1);
            }
            /*/
            let iy = debugLog.findIndex((log, j) => j < windowSize && /\blow\b/.test(log.tags));
            if(iy < 0) iy = debugLog.findIndex(log => !/\bkeep\b/.test(log.tags));
            if(iy >= 0) debugLog.splice(iy, 1);
            //*/
        }
    }, 10);

    let { log, debug, error } = global.console;

    global.console.log = (msg, ...tags) => 
    {
        let logEntry = `log ${timestamp()}: ${msg}`;
        log(logEntry);
        persist(logEntry, tags);
    }

    global.console.debug = (msg, ...tags) => 
    {
        let logEntry = `dbg ${timestamp()}: ${msg}`;
        //debug(log);
        persist(logEntry, tags);
    };

    // global.console.debug = () => {};
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
console.log(`Starting`, 'lifecycle', 'keep');

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
    console.log(`config settings loading`, 'lifecycle', 'config', 'keep');
    config = await settings.load('config.json');

    console.log(`sunstatus event registration`, 'lifecycle', 'socketio', 'keep');
    sunstatus.on('sunset', -20, () => console.log('sunset callback', 'keep'));
    sunstatus.on('sunrise', 53, () => console.log('sunrise callback', 'keep'));
    
    console.log(`sunstatus: ${JSON.stringify(await sunstatus.getDay())}`, 'sunstatus', 'keep');

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
        console.debug(`setting door closed: ${isDoorClosed}`, 'update', 'door');
        //easeR.set(isDoorClosed ? 0 : 255);
        isDoorClosed ? easeR.pause(0) : easeR.resume();

        console.debug(`setting connected: ${isConnected}`, 'update', 'connection');
        //easeG.set(isConnected ? 0 : 255);
        isConnected ? easeG.pause(0) : easeG.resume();
    };


    console.log(`socket.io event registration`, 'lifecycle', 'socketio', 'keep');

    io.on('connection', (socket) =>
    {
        console.log('websocket connection', 'event');
        isConnected = true;
        updateState();

        socket.on("disconnecting", (reason) => 
        {
            console.log(`disconnected: ${reason}`, 'event');
            isDoorClosed = isConnected = false;
            updateState();
        }); 

        socket.on('door', (msg) => 
        {
            console.log(`door ${msg}`, 'event');
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
