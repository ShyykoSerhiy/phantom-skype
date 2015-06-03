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
           console.log("Error parsing msg " + msg);
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
                 * Clicks on button to open skype(if it exists on page)
                 * @returns {boolean} true if button to open skype is present and was clicked
                 */
                tryOpenSkype: function () {
                    function triggerMouseEvent(node, eventType) {
                        var clickEvent = document.createEvent('MouseEvents');
                        clickEvent.initEvent(eventType, true, true);
                        node.dispatchEvent(clickEvent);
                    }

                    var element = document.querySelector(':not(.c_md).c-NavItem.c_hiconm a');
                    if (element) {
                        console.log(JSON.stringify({
                            log: "Skype opened."
                        }));
                        triggerMouseEvent(element, "mousedown");
                        this.isSkypeOpened = true;
                    }
                    return this.isSkypeOpened;
                },

                /**
                 * Adds mutation observers to recent list(if it exists)
                 * @returns {boolean} true if mutation observers were added
                 */
                tryInitializeSkype: function () {
                    var recentListUi = this._getRecentListUl();

                    if (this._hasAllUiLoaded()) {
                        this.isSkypeInitialized = true;
                        new MutationObserver(function (mutations) {
                            var newMessages = mutations.filter(function (mutation) {
                                return mutation.target.classList.contains('RecentConversationsControl_MessageText')
                                    && mutation.addedNodes.length
                            }).map(function (mutation) {
                                    function upTo(el, tagName) {
                                        tagName = tagName.toLowerCase();
                                        while (el && el.parentNode) {
                                            el = el.parentNode;
                                            if (el.tagName && el.tagName.toLowerCase() === tagName) {
                                                return el;
                                            }
                                        }
                                        return null;
                                    }

                                    var liParent = upTo(mutation.target, 'li');
                                    if (liParent) {
                                        return this._getMessageFromRecentLi(liParent);
                                    }
                                    return {}; //todo maybe empty message? 
                                }, this
                            );
                            if (typeof window.callPhantom === 'function') {
                                window.callPhantom(newMessages);
                            }
                        }.bind(this)).observe(recentListUi, {
                                subtree: true,
                                childList: true
                            }
                        );
                    } else {
                        console.log(JSON.stringify({
                            log: "Waiting for Skype to initialize."
                        }));
                    }
                    return this.isSkypeInitialized;
                },

                sendMessage: function (message) {
                    function triggerEnterEvent(node) {
                        var keyEvent = document.createEvent('Event');//dirty hack for firing keydown Enter event
                        keyEvent.initEvent('keydown', true, true, window, false, false, false, false, 13, 0);
                        keyEvent.keyCode = 13;
                        node.dispatchEvent(keyEvent);
                    }

                    this.openConversation(message);

                    var textInput = this._getTextInput();
                    textInput.value = message.message;
                    triggerEnterEvent(textInput);

                    this.closeConversation();
                    return true
                },

                openConversation: function (contact) {
                    var conversations = Array.prototype.slice.apply(
                        this._getContactList()
                    ).filter(function (element) {
                            return contact.contact === element.querySelector('.Name').innerHTML;
                        }
                    );
                    if (conversations.length > 0) {
                        conversations[0].click();// todo picking first?
                        return true;
                    }
                    return false;
                },

                closeConversation: function () {
                    var backButton = this._getBackButton();
                    if (backButton) {
                        backButton.click();
                    }
                    return !!backButton;
                },

                getRecentMessages: function () {
                    return {
                        recent: Array.prototype.slice.apply(this._getRecentList()).map(function (element) {
                            return this._getMessageFromRecentLi(element);
                        }, this)
                    }
                },

                getContacts: function () {
                    return Array.prototype.slice.apply(
                        this._getContactList()
                    ).map(function (element) {
                            return {
                                contact: element.querySelector('.Name').innerHTML
                            }
                        }
                    );
                },
                
                _getMessageFromRecentLi: function (liRecentElement) {
                    return {
                        contact: liRecentElement.querySelector('.RecentConversationsControl_ContactDisplayName').innerHTML,
                        message: liRecentElement.querySelector('.RecentConversationsControl_MessageText span').innerHTML
                    }
                },

                /**
                 * private section
                 */
                _hasAllUiLoaded: function () {
                    return !!(this._getRecentListUl() && this._getContactListUl());
                },


                _getRecentList: function () {
                    return this._getRecentListUl().querySelectorAll('li');
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
                 * @private
                 */
                _getContactList: function () {
                    return this._getContactListUl().querySelectorAll('li');
                },

                /**
                 *
                 * @returns {HTMLElement}
                 */
                _getContactListUl: function () {
                    return document.querySelector('ul.ContactList');
                },

                _getBackButton: function () {
                    return document.querySelector('.BackButton');
                },

                _getTextInput: function () {
                    return document.querySelector('.ModernConversationInputControl_TextBox');
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
        tryOpenSkype: function () {
            return page.evaluate(function () {
                return window.SkypeApi.tryOpenSkype();
            });
        },
        tryInitializeSkype: function () {
            return page.evaluate(function () {
                return window.SkypeApi.tryInitializeSkype();
            });
        },
        getContacts: function () {
            return page.evaluate(function () {
                return window.SkypeApi.getContacts();
            });
        },
        sendMessage: function (message) {
            return page.evaluate(function (message) {
                return window.SkypeApi.sendMessage(message)
            }, message);
        },
        getRecentMessages: function () {
            return page.evaluate(function () {
                return window.SkypeApi.getRecentMessages();
            });
        }
    };

    var steps = {
        'https://login.live.com': function (page, status) {
            checkStatus('Login', page, status);
            delete steps['https://login.live.com']; //only once
            page.evaluate(function (username, password) {
                document.querySelector('input[name="login"]').value = username; //TODO USERNAME
                document.querySelector('input[name="passwd"]').value = password; //TODO PASSWORD
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

            var openSkypeInterval = setInterval(function () {
                var skypeOpened = phantomSkypeApi.tryOpenSkype();
                if (skypeOpened) { //TODO fail if maxRetry reached 
                    clearInterval(openSkypeInterval);
                    var i = 0;
                    var initializeSkypeInterval = setInterval(function () {
                        i++;
                        var skypeInitialized = phantomSkypeApi.tryInitializeSkype();
                        if (skypeInitialized) {
                            clearInterval(initializeSkypeInterval);
                            console.log("Skype initialized. Ready to go.");

                            if (phantomSkypeApi.initializedCallback) {
                                phantomSkypeApi.initializedCallback();
                            }
                            //TODO Skype is ready
                        }
                    }, 5000)
                }
            }, 5000);
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
//phantom.exit();TODO
