var io = require('socket.io')();
var username = process.argv[2];
var password = process.argv[3];
if (!username || !password){
    throw new Error('Username and password should be provided as commandline arguments!');
}
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('initialized', function () {
        console.log('Everything is initialized now. We can send and receive messages.');
        socket.on('message', function (data) {
            console.log(data);
            socket.emit('message', JSON.stringify({ //sending back response
                conversationId: data.conversationId,
                text: data.message.info.text + ':' + data.message.sender.id
            }));
        });
    });
    socket.on('disconnect', function () {
        console.log('phantom disconnected');
    });

    socket.emit('initialize', JSON.stringify({username: username, password: password}));
});
io.listen(3000);

//starting child phantom process
var path = require('path');
var childProcess = require('child_process');

var childArgs = [
    path.join(__dirname, 'socketioIntegration.js'),
    'http://localhost:3000'
];
var child = childProcess.execFile('phantomjs', childArgs);
child.stdout.on('data', function (data) {
    console.log(data.toString());
});