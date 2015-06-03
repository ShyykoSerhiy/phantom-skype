var io = require('socket.io')();
var prefix = "PS: ";
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('initialized', function (data) {
        console.log('Everything is initialized now. We can send and receive messages.');
        socket.emit('message', JSON.stringify({
            contact: 'Stanley Shyiko',//fixme
            message: prefix + 'This is test message'
        }))
    });
    socket.on('disconnect', function () {
        console.log('phantom disconnected');
    });
    socket.on('message', function (data) {
        console.log(data);
    });

    socket.emit('initialize', JSON.stringify({username: 'aaa.zzz@bbb.yyy', password: 'password'}));
});
io.listen(3000);

//starting child phantom process
var path = require('path');
var childProcess = require('child_process');

var childArgs = [
    path.join(__dirname, 'socketioIntegration.js')
];
var child = childProcess.execFile('phantomjs', childArgs);
child.stdout.on('data', function (data) {
    console.log(data.toString());
});