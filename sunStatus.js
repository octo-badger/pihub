/*
    needs better handling
    Think I wrote this to allow async return of a value that is being polled
    At the moment I think a call to checkDateAsync() will block if lastDate matches the current date (line 29-ish)
*/

const moment = require('moment');
const fs = require('fs');

let day = null;
let lastDate = null;


async function checkDateAsync()
{
    return new Promise(async (resolve) =>
    {
        //console.log('checking date');
        checkDate(resolve);
    });
}


function checkDate(resolve)
{
    let now = moment();
    let month = now.format('MMMM');
    let date = now.format('D');
    let datestamp = `${month} - ${date}`;

    if(lastDate !== datestamp)
    {
        lastDate = datestamp;
        console.log(`datestamp: ${datestamp}`);
        
        fs.readFile('dates.json', (err, data) =>
        {
            if (err) throw err;

            let dates = JSON.parse(data);
            
            day = dates[month].find(d => d.date === date)
            console.log(`day: ${day}`);
            resolve && resolve();
        });   
    }
}

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
exports.getData = async () => {
                            await checkDateAsync();
                            return day;
                        }
//*/

//setInterval(checkDate, 600000);
setInterval(checkDate, 6000);

