
const Settings = require('./lib/Settings');

const settings = new Settings({ defaultData: { a1: { } } });

async function go()
{
    let config = await settings.load('file.json');
    //current saved config: {"a1":{"b1":"b1","b2":{"c1":"c1"}}}

    // operate like it's a normal object graph:
    config.a1.b1 = { n1: 'new' };                       // replace string with object
    config.a1.b1.c1 = { n2: 'new2' };                   // create new property
    config.blah = { s: [1, { d: [{ e: 'e' }]}, 3] };    // wtf!? complex nested arrays within objects within arrays
    config.blah.s[1].d[0].e = "also new";               // set leaf?
}

go();