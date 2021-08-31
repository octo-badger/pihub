
const app = express();
const server = http.createServer(app);
const io = socketio(server);



// state manager eventemitter?