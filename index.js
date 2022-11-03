
//console.log(`stl: ${Error.stackTraceLimit}`);

const server = require('./server');
const socketio = require('socket.io');
const io = socketio(server);

//const Gpio = require('pigpio').Gpio;
const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

const sunstatus = require('./sunStatus')
const DynamicEase = require('./lib/DynamicEase');
const Settings = require('./lib/Settings');

const settings = new Settings(
                { 
                    defaultData:
                    {
                        lightOptions: 
                        {
                            maxChangePerSec: 200, 
                            acc: 5, 
                            clamp: { lower: 0, upper: 255},
                            round: true
                        },
                        //blue: { maxChangePerSec: Infinity, acc: 1, stepMillis: 50 }
                        blue: { maxChangePerSec: 99999, acc: 1, stepMillis: 50 }
                    }
                });

                
function merge(base, mods)
{
    return Object.assign({}, base, mods);
}

let config = null;

async function go()
{
    config = await settings.load('config.json');
    console.log(`sunstatus: ${JSON.stringify(await sunstatus.getData())}`);

    let pins = {
        doorLightR: 26,
        doorLightG: 6,
        doorLightB: 5
    };

    // let lightOptions = 
    // {
    //     maxChangePerSec: 200, 
    //     acc: 5, 
    //     clamp: { lower: 0, upper: 255},
    //     round: true
    // };

    const doorLightR = new Gpio(pins.doorLightR, { mode: Gpio.OUTPUT });
    const doorLightG = new Gpio(pins.doorLightG, { mode: Gpio.OUTPUT });
    const doorLightB = new Gpio(pins.doorLightB, { mode: Gpio.OUTPUT });

    //let start = Date.now();

    //let easeB = new DynamicEase(0, Object.assign({}, lightOptions, {maxChangePerSec: Infinity, acc: 1, stepMillis: 50}),
    let bOptions = merge(config.lightOptions, config.blue);
    let easeB = new DynamicEase(0, bOptions,
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



    io.on('connection', (socket) =>
    {
        console.log('websocket connection');
        socket.on("disconnecting", (reason) => console.log(`disconnected: ${reason}`)); 

        let easeR = new DynamicEase(0, config.lightOptions,
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
