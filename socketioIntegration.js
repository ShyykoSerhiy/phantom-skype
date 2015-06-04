var skype = require('./skype.js');
var phantomSocket = require('phantom-socketio');
var fs = require('fs');
var system = require('system');
var simpleJsPath = system.args[0];
var indexJsDirectoryPath = simpleJsPath.substring(0, simpleJsPath.lastIndexOf(fs.separator))
    + fs.separator + 'node_modules'
    + fs.separator + 'phantom-socketio';

phantomSocket.initialize(indexJsDirectoryPath, system.args[1], function () {
    phantomSocket.on('initialize', function (credentials) {
        credentials = JSON.parse(credentials);
        skype.phantomSkypeApi.initialize(credentials.username, credentials.password, function () {
                phantomSocket.emit('initialized', '');
            },
            function (message) {
                phantomSocket.emit('message', message)
            }
        );
    });

    phantomSocket.on('message', function (data) {
        data = JSON.parse(data);
        skype.phantomSkypeApi.sendMessage(data);
    });
});