# PhantomSkype
Unofficial Skype API.

##Running example
PhantomJS should be in path. Skype account should be linked to Microsoft account. As username and password you should 
use you Microsoft account. Check before running, that you can login with your Microsoft account to 
[OneDrive](https://onedrive.live.com/?gologin=1&mkt=en-US).

```
git clone https://github.com/ShyykoSerhiy/phantom-skype.git
cd phantom-skype
npm install
node nodeDemo.js username password
```

After 'Everything is initialized now. We can send and receive messages.' appears in console any message you receive 
in your Skype will be automatically replied.

##Disclaimer 
This project heavily relies on OneDrive's Skype implementation. If Microsoft Corporation decides to remove Skype
implementation from OneDrive(or significantly change it) PhantomSkype might not be in working state. Therefore it's not
recommended to use it in any critical part of production code. In fact it's not recommended to use it in production at all.