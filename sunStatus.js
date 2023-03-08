/*
    needs better handling
    Think I wrote this to allow async return of a value that is being polled
    At the moment I think a call to checkDateAsync() will block if lastDate matches the current date (line 29-ish)
*/

const moment = require('moment');
const fs = require('fs');

console.log(`Starting sunStatus`, 'lifecycle', 'keep');

let day = null;
let lastDate = null;


async function checkDateAsync()
{
    return new Promise(async (resolve) =>
    {
        //console.debug('checking date');
        checkDate(resolve);
    });
}


function checkDate(resolve)
{
    console.debug('in checkDate()', 'sunstatus', 'low');
    let now = moment();
    let month = now.format('MMMM');
    let date = now.format('D');
    let datestamp = `${month} - ${date}`;

    if(lastDate !== datestamp)
    {
        lastDate = datestamp;
        console.debug(`datestamp: ${datestamp}`, 'sunstatus', 'low');
        
        fs.readFile('dates.json', (err, data) =>
        {
            if (err) throw err;

            let dates = JSON.parse(data);
            
            day = dates[month].find(d => d.date === date)
            //console.debug(`day: ${day}`, 'sunstatus');
            resolve && resolve();
        });   
    }
}

/*
    async getDay() // return day (only load day if it's the first time)

    on('sunset', offset, callback)  // subscribe to an event, with an offset

    // setInterval(checkSubs, 1000 * 60)    // 

*/

let subscriptions = [];
const eventNames = ['sunrise', 'sunset'];


/**
 * subscribe to an event
 * @param {string} eventName the name of the event being subscribed to
 * @param {number} offset positive or negative minutes
 * @param {function} callback the callback to fire on event
 */
function on(eventName, offset, callback)
{
    console.debug(`registering on ${eventName} with offset ${offset}`, 'sunstatus');
    if(!eventNames.some(en => eventName === en))        // check eventName
        console.warn('unknown event: ' + eventName, 'sunstatus');

    subscriptions.push({
        event: eventName,
        offset: offset,
        callback: callback
    });
}


function check()
{
    console.debug('in check()', 'sunstatus');
    checkDate();
    checkSubscriptions();
}


function checkSubscriptions()
{
    console.debug('in checkSubscriptions()', 'sunstatus', 'low');
    let nowStamp = _asTimestamp(new Date());
    
    subscriptions.forEach(sub => 
        {
            sub.lastCalled !== nowStamp && (sub.lastCalled = null);       

            let offestTimestamp = _offestTimestamp(sub);
            console.debug(`nowStamp: ${nowStamp}, offestTimestamp: ${offestTimestamp}, sub.lastCalled: ${sub.lastCalled}`, 'sunstatus');

            if(sub.lastCalled !== nowStamp && offestTimestamp === nowStamp)
            {
                sub.callback();
                sub.lastCalled = nowStamp;
            }
        });
}


/**
 * get the timestamp offset from the day
 * @param {subscription} subscription subscription object
 * @returns hours / minutes timestamp
 */
function _offestTimestamp(subscription)
{
    console.debug('in _offestTimestamp() ' + day[subscription.event], 'sunstatus', 'low');
    let eventTime = _time(day[subscription.event]);
    console.debug('subscription.offset ' + subscription.offset, 'sunstatus', 'low');
    let offsetDatetime = new Date(eventTime.getTime() + (subscription.offset * 60000));
    return _asTimestamp(offsetDatetime);
}


/**
 * get a date object with the time set to the timestamp
 * @param {string} timeStamp timestamp in "hours:minutes" format
 * @returns date object from the timestamp
 */
function _time(timeStamp)
{
    console.debug('in _time()', 'sunstatus', 'low');
    let grps = /(?<hours>\d+):(?<minutes>\d+)/.exec(timeStamp).groups;                          // liberate the hours and minutes from the timeStamp
    console.debug(`= ${grps.hours}:${grps.minutes}`, 'sunstatus', 'low');
    let time = new Date();                                                                      // create a new date object
    time.setHours(grps.hours);                                                                  // set hours
    time.setMinutes(grps.minutes);                                                              // set minutes
    return time;
}


/**
 * Extract an "<hours>:<minutes>" timestamp from the passed date object
 * @param {Date} datetime date object
 * @returns string timestamp
 */
function _asTimestamp(datetime)
{
    console.debug('in _asTimestamp()', 'sunstatus', 'low');
    return `${datetime.getHours()}`.padStart(2, '0') + ':' + `${datetime.getMinutes()}`.padStart(2, '0');
}


let getDay = async () => {
                        console.debug('in getDay()', 'sunstatus', 'low');
                        if(day == null) await checkDateAsync();
                        checkSubscriptions();
                        return day;
                    };
/*
module.exports = 
{
    getData: async () => 
    {
        await checkDateAsync();
        return day;
    }
}
/*/
exports.getDay = getDay;
exports.on = on;
//*/

//setTimeout(check, 1);
setInterval(check, 30000);

