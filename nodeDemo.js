var io = require('socket.io')();
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('initialized', function (data) {
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

    socket.emit('initialize', JSON.stringify({username: 'aaa.zzz@bbb.yyy', password: 'password'}));
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