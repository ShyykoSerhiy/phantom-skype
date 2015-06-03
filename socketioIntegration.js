var skype = require('./skype.js');
var phantomSocket = require('phantom-socketio');
var fs = require('fs');
var system = require('system');
var simpleJsPath = system.args[0];
var indexJsDirectoryPath = simpleJsPath.substring(0, simpleJsPath.lastIndexOf(fs.separator))
    + fs.separator + 'node_modules'
    + fs.separator + 'phantom-socketio';

phantomSocket.initialize(indexJsDirectoryPath, 'http://localhost:3000', function () {
    phantomSocket.on('initialize', function (credentials) {
        credentials = JSON.parse(credentials);
        console.log(credentials.username, credentials.password);
        skype.phantomSkypeApi.initialize(credentials.username, credentials.password, function () {
                console.log('initialized callback');
                phantomSocket.emit('initialized', '');
            },
            function (messages) {
                console.log('message callback');
                messages.forEach(function (message) {
                    phantomSocket.emit('message', message)
                });
            }
        );
    });

    phantomSocket.on('message', function (data) {
        data = JSON.parse(data);
        skype.phantomSkypeApi.sendMessage(data);
    });
});