(function () {
    var page = require('webpage').create();
    page.viewportSize = {
        width: 800,
        height: 200
    };

    page.onCallback = function (data) {
        if (data) {
            if (phantomSkypeApi.messageCallback) {
                phantomSkypeApi.messageCallback(data);
            }
        }
    };
    page.onConsoleMessage = function (msg, lineNum, sourceId) {
        try {
            msg = JSON.parse(msg);
            if (msg.log) {
                console.log(msg.log)
            }
        } catch (e) {
            //nothing to do here 
            //console.log("Error parsing msg " + msg);
        }
    };
    page.onLoadFinished = function (status) {
        executeStep(page, status);
    };

    function initializeHelperFunctions() {
        page.evaluate(function () {
            window.SkypeApi = {
                /**
                 * True if skype icon was clicked
                 */
                isSkypeOpened: false,
                /**
                 * True if skype actually exists on page
                 */
                isSkypeInitialized: false,

                /**
                 * @type {Microsoft.Live.Messenger.ConversationCollection[]}
                 */
                conversationCollections: [],

                tryMonkeyPatchMessengerApi: function () {
                    var this_ = this;
                    var messengerApiExists = window.Microsoft && window.Microsoft.Live && window.Microsoft.Live.Messenger;
                    if (!messengerApiExists) {
                        return false;
                    }

                    var oldConversationCollectionConstructor = window.Microsoft.Live.Messenger.ConversationCollection;
                    var oldConversationCollection_onMessageReceived = window.Microsoft.Live.Messenger.ConversationCollection.prototype._onMessageReceived;
                    var extendedConversationCollection = function (e) {
                        oldConversationCollectionConstructor.call(this, e);
                        this_.conversationCollections.push(this);
                    };
                    extendedConversationCollection.prototype = Object.create(oldConversationCollectionConstructor.prototype);
                    extendedConversationCollection.prototype.constructor = extendedConversationCollection;
                    extendedConversationCollection.prototype._onMessageReceived = function (e, t) {
                        oldConversationCollection_onMessageReceived.call(this, e, t);
                        if (typeof window.callPhantom === 'function') {
                            window.callPhantom({
                                conversationId: e,
                                message: t
                            });
                        }
                    };

                    window.Microsoft.Live.Messenger.ConversationCollection = extendedConversationCollection;
                    return true;
                },

                /**
                 * @returns {boolean} true if all ui is initialized
                 */
                tryInitializeSkype: function () {
                    if (this._hasAllUiLoaded()) {
                        this.isSkypeInitialized = true;
                    } else {
                        console.log(JSON.stringify({
                            log: "Waiting for Skype to initialize."
                        }));
                    }
                    return this.isSkypeInitialized;
                },

                sendMessage: function (message) {
                    var sent = false;
                    this.conversationCollections.forEach(function (conversationCollection) {
                        if (sent) {
                            return;
                        }
                        var conversation = conversationCollection._getConversationById$1(message.conversationId);
                        if (conversation) {
                            conversation.sendMessage(new window.Microsoft.Live.Messenger.TextMessage(message.text));
                            sent = true;
                        }
                    });
                    return sent;
                },

                /**
                 * private section
                 */
                _hasAllUiLoaded: function () {
                    return !!(this._getRecentListUl() && this._getContactListUl());
                },
                
                /**
                 *
                 * @returns {HTMLElement}
                 */
                _getRecentListUl: function () {
                    return document.querySelector('div[resourceid="RecentList"] ul[resourceid="ItemsContainer"]');
                },

                /**
                 *
                 * @returns {HTMLElement}
                 */
                _getContactListUl: function () {
                    return document.querySelector('ul.ContactList');
                }
            };
        });
    }

    var phantomSkypeApi = {
        initialize: function (username, password, initializedCallback, messageCallback) {
            this.username = username;
            this.password = password;
            this.initializedCallback = initializedCallback;
            this.messageCallback = messageCallback;
            page.open('https://login.live.com/');
        },

        isSkypeOpened: function () {
            return page.evaluate(function () {
                return window.SkypeApi.isSkypeOpened;
            });
        },
        isSkypeInitialized: function () {
            return page.evaluate(function () {
                return window.SkypeApi.isSkypeInitialized;
            });
        },
        tryInitializeSkype: function () {
            return page.evaluate(function () {
                return window.SkypeApi.tryInitializeSkype();
            });
        },

        tryMonkeyPatchMessengerApi: function () {
            return page.evaluate(function () {
                return window.SkypeApi.tryMonkeyPatchMessengerApi()
            });
        },
        sendMessage: function (message) {
            return page.evaluate(function (message) {
                return window.SkypeApi.sendMessage(message)
            }, message);
        }
    };

    var steps = {
        'https://login.live.com': function (page, status) {
            checkStatus('Login', page, status);
            delete steps['https://login.live.com']; //only once
            page.evaluate(function (username, password) {
                document.querySelector('input[name="login"]').value = username; 
                document.querySelector('input[name="passwd"]').value = password;
                document.querySelector('input[name="SI"]').click();
                //todo Keep me signed in?
            }, phantomSkypeApi.username, phantomSkypeApi.password);
        },
        'https://account.microsoft.com': function (page, status) {
            checkStatus('Account', page, status);
            page.open('https://onedrive.live.com');
        },
        'https://onedrive.live.com': function (page, status) {
            checkStatus('OneDrive', page, status);
            var isSignedIn = page.evaluate(function () {
                return !!document.querySelector('.SignedIn');
            });
            if (!isSignedIn) {
                return; //nothing to do(this step is executed twice(6-8 times to be precise). First(not signed) and all after second are obsolete). 
            }
            delete steps['https://onedrive.live.com'];
            initializeHelperFunctions();

            var monkeyPatchMessengerApi = setInterval(function () {
                if (phantomSkypeApi.tryMonkeyPatchMessengerApi()) {//TODO fail if maxRetry reached
                    clearInterval(monkeyPatchMessengerApi);
                } else {
                    return;
                }
                var initializeSkypeInterval = setInterval(function () {
                    var skypeInitialized = phantomSkypeApi.tryInitializeSkype();
                    if (skypeInitialized) {
                        clearInterval(initializeSkypeInterval);
                        console.log("Skype initialized. Ready to go.");

                        if (phantomSkypeApi.initializedCallback) {
                            phantomSkypeApi.initializedCallback();
                        }
                        //Skype is ready
                    }
                }, 5000)
                
            }, 500);
        }
    };

    function executeStep(page, status) {
        var currentUrl = getCurrentUrl(page);
        for (var property in steps) {
            if (steps.hasOwnProperty(property)) {
                if (currentUrl.indexOf(property) !== -1) {
                    steps[property](page, status);
                }
            }
        }
    }

    function checkStatus(step, page, status, errorMessage) {
        console.log(step, status);
        if (status !== 'success') {
            if (errorMessage) {
                console.log(errorMessage);
            }
            phantom.exit();
        }
    }

    function getCurrentUrl(page) {
        return page.evaluate(function () {
            return window.location.href;
        });
    }

    exports.phantomSkypeApi = phantomSkypeApi;
})();
