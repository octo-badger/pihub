
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
};

function checkDate(resolve)
{
    let now = moment();
    let month = now.format('MMMM');
    let date = now.format('D');

    if(lastDate !== month + date)
    {
        lastDate = month + date;
        console.log(`${month} - ${date}`);
        
        fs.readFile('dates.json', (err, data) =>
        {
            if (err) throw err;

            let dates = JSON.parse(data);
            
            day = dates[month].find(d => d.date === date)
            console.log(day);
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
}v
/*/
exports.getData = async () => {
                            await checkDateAsync();
                            return day;
                        }
//*/

//setInterval(checkDate, 600000);
setInterval(checkDate, 6000);

