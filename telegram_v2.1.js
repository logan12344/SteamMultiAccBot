// Node modules
const TelegramBot = require('node-telegram-bot-api'), sqlite3 = require('sqlite3').verbose(), SteamUser = require('steam-user'), 
	SteamTotp = require('steam-totp'), settings = require('./settings.json'), SocksAgent = require('socks5-https-client/lib/Agent'),
	fs = require('fs'), getSteamID64 = require('customurl2steamid64/lib/steamid64'),
	sleep = require('system-sleep');

const socksAgent = new SocksAgent({socksHost: settings.host, socksPort: settings.port, socksUsername: settings.login, socksPassword: settings.psswd}),
	bot = new TelegramBot(settings.token, {polling: true, agent: socksAgent});

// Global variebles
var config, client, configArray = {}, accountCount = settings.count, connect, addFriends1 = false, deleteRequestFriends1 = false,
	spamFriends1 = false, countOfFriends = 0, countMess = 0, countOfFillArr = 0, messagesForSend = [], allID = [];

// Add bots option
const addBotOptions = {username: '', password: '', sharedSecret: ''};

function requireJSON(){
	configArray = {};
	for(var i = 1; i <= accountCount; i++){
		delete require.cache[require.resolve('./config' + i + '.json')];
		configArray[i] = require('./config' + i + '.json');
	}
}

// Telegram's functions
bot.onText(/\/start/, async function(msg) { // Start
	console.log('Use /bot to add new bots, if bots was add use /go, help - use /help');
	await bot.sendMessage(settings.chatID, '\u{1F6A7} Use /bot to add new bots, if bots was add use /go, help - use /help');
	console.log(msg.chat.id);
});

bot.onText(/\/help/, function() { // Help
	var keyboard = {
        "inline_keyboard":[
			[{
				text: 'Добавить Стим аккаунты \u{2753}',
				callback_data: 'addAccount'
			}],
			[{
				text: 'Добавление в друзья \u{2753}',
				callback_data: 'addToFriends'
			}],
			[{
				text: 'Удалить заявки в друзья \u{2753}',
				callback_data: 'deleteRequest'
			}],
			[{
				text: 'Спам \u{2753}',
				callback_data: 'spamFriends'
			}]
        ]
    };
	bot.sendMessage(settings.chatID,'\u{1F6A8} Select help\u{2757}', {'reply_markup': JSON.stringify(keyboard)});
});

bot.onText(/\/go/, function() { // Go
	requireJSON();
	if(configArray != {})
		addDeleteSpam();
	else
		console.log('Use /bot');
});

bot.onText(/\/bot/, function() { // Bot
	console.log('Enter file with usernames and pass:');
	bot.sendMessage(settings.chatID, 'Enter file with usernames and pass:');
	bot.once('document', onDocumentAddBot);
});

// Callbacks
bot.on('callback_query', function(msg)  {
	switch (msg.data) {
		case 'func1':
			addFriends1 = true;
			bot.sendMessage(settings.chatID, '\u{270F} Upload a file with ID64');
			bot.once('document', temp);
			break;
		case 'func2':
			deleteRequestFriends1 = true;
			temp(msg.message);
			break;
		case 'func4':
			spamFriends1 = true;
			countMess = 0;
			countOfFillArr = 0;
			messagesForSend = [];
			bot.sendMessage(settings.chatID, '\u{270F} Сколько сообщений одному человеку? (Число)');
			bot.once('message', countMessages);
			break;
	}
});

bot.on('callback_query', function(msg)  {
	switch (msg.data) {
		case 'addAccount':
			console.log('Help addAccount');
			bot.sendPhoto(settings.chatID, 'https://drive.google.com/open?id=14NQ1fcWBAHbNI15Y9i8R-x2Q0jl34SDk', {caption: 'Use /bot and drop file with steam accounts'});
			bot.sendPhoto(settings.chatID, 'https://drive.google.com/open?id=1yo4fWL2xBpmoBU8_3HZS74hcPTTPkTok', {caption: 'Example of file (login:password)'});
			break;
		case 'addToFriends':
			console.log('Help addToFriends');
			bot.sendPhoto(settings.chatID, 'https://drive.google.com/open?id=1FE8yOJKhOi-Mt0LdMmgExYneF8ZbVU7u', {caption: 'Use /go, choose "\u{1F4B0} Добавить друзей на все аккаунты" and drop file with ids'});
			bot.sendPhoto(settings.chatID, 'https://drive.google.com/open?id=1fZooWZr4yZjRIFqUAO9msbomv3gAy018', {caption: 'Example of file'});
			break;
		case 'deleteRequest':
			console.log('Help deleteRequest');
			bot.sendPhoto(settings.chatID, 'https://drive.google.com/open?id=1ChSmX9GEe59pxCm7IyGjbH1vDw6vjoM5', {caption: 'Use /go and choose "\u{26A0} Удалить отправленные заявки в друзья"'});
			break;
		case 'spamFriends':
			console.log('Help spamFriends');
			bot.sendPhoto(settings.chatID, 'https://drive.google.com/open?id=10aebkhQqvt2QM2nVQZAQmwDWgASZM2YW', {caption: 'Use /go and choose "\u{1F4E8} Spam друзьям"'});
			break;
	}
});

async function countMessages(msg){
	countMess = msg.text;
	console.log('countMess = ' + countMess);
	if(countMess > 0){
		await bot.sendMessage(settings.chatID, '\u{270F} Введите сообщение номер 1: ');
		bot.once('message', fillTheArrayOfMessages);
	}else{
		await bot.sendMessage(settings.chatID, '\u{274C} Сообщений должно быть больше 0! Начните заново! ');
		addDeleteSpam(msg);
	}
}

async function fillTheArrayOfMessages(msg){
	messagesForSend[countOfFillArr] = msg.text;
	console.log('messagesForSend['+countOfFillArr+'] = ' + messagesForSend[countOfFillArr]);
	countOfFillArr++;
	if(countOfFillArr == countMess)
		temp(msg);
	else{
		await bot.sendMessage(settings.chatID, '\u{270F} Введите сообщение номер '+ (countOfFillArr+1) +': ');
		bot.once('message', fillTheArrayOfMessages);
	}
}

// Functions for Accounts (Callbacks)
function addDeleteSpam() {
	var keyboard = {
        "inline_keyboard": [
			[{
				text: '\u{1F4B0} Добавить друзей на все аккаунты',
				callback_data: 'func1'
			}],
			[{
				text: '\u{26A0} Удалить отправленные заявки в друзья',
				callback_data: 'func2'
			}],
			[{
				text: '\u{1F4E8} Spam друзьям',
				callback_data: 'func4'
			}]
        ]
    };
    bot.sendMessage(settings.chatID,'\u{231B} Select function for all accounts: ', {'reply_markup': JSON.stringify(keyboard)});
}

// Add Bot into JSONs
function onDocumentAddBot(msg){
	bot.downloadFile(msg.document.file_id, './path/').then(function (path) {
		console.log(path);
		fs.readFile(path, 'utf8', function(err, contents) {
			allID = contents.split('\r\n');
			console.log(allID.length);
			var p = 0;
			bot.sendMessage(settings.chatID, '\u{26A0} Loading, please wait ');
			for( p; p < allID.length; p++)
				writeFile(allID[p], p);
		});
	});
}

function writeFile(line, p){
	var fields = line.split(':');
	let configurate = {  
		username: fields[0],
		password: fields[1],
		sharedSecret : ""
	};
	fs.writeFileSync('config' + (p+1) + '.json', JSON.stringify(configurate), function(err) {  
		if (err) throw err;
	});
	console.log('Account added: username ' + fields[0] + 'pass ' + fields[1]);
	bot.sendMessage(settings.chatID,'Bot with username: ' + fields[0]);
}

// Steam Connections
function connectSteamClient(msg, username, pass, sharedSecret, guard, i) {
	client = new SteamUser();
	client.setOption('promptSteamGuardCode', false);
	client.logOn({
		"accountName": username,
		"password": pass
	});
	
	client.on('error', function(e) {
		if(e){
			console.log(String(e));
			client = undefined;
			return connect_GoFunction_Logout(msg, i+1);
		}
	});
	
	client.on('steamGuard', function(domain, callback){
		if(sharedSecret == '1' && guard == undefined){
			console.log('Enter Guard:');
			bot.sendMessage(settings.chatID,'\u{1F4AB} Enter Guard:');
			bot.once('message', function(msg){
				connectSteamClient(msg, connect.username, connect.password, connect.sharedSecret, msg.text);
			});
		}else if(sharedSecret == '1' && guard != undefined)
			callback(guard);
		else
			callback(SteamTotp.generateAuthCode(sharedSecret));
	});

	client.on('loggedOn', function() {
		console.log(i +' Logged into Steam ' + connect.username);
		bot.sendMessage(settings.chatID,'\u{2705}'+ i +' Logged into Steam ' + connect.username);
		if(addFriends1)
			addFriends(msg, i);			
		if(deleteRequestFriends1)
			deleteRequestFriends(msg, i);
		if(spamFriends1)
			spamFriends(msg, i);
	});
}

function temp(msg){
	connect_GoFunction_Logout(msg, 1);
}

function connect_GoFunction_Logout(msg, i){
	requireJSON();
	if (client == undefined) {
		connect = configArray[i];
		if((i <= accountCount) && (connect.username != '')){
			connectSteamClient(msg, connect.username, connect.password, connect.sharedSecret, undefined, i);
		}else{
			addFriends1 = false;
			deleteRequestFriends1 = false;
			spamFriends1 = false;
			addDeleteSpam(msg);
		}
	}
}

// Add Friends
function addFriends(msg, i){
	bot.downloadFile(msg.document.file_id, './path/').then(function (path) {
		console.log(path);
		fs.readFile(path, 'utf8', function(err, contents) {
			allID = contents.split('\r\n');
			console.log(allID.length);
			var p = 0;
			bot.sendMessage(settings.chatID, '\u{26A0} Loading, please wait ');
			for( p; p < 30; p++)
				addFriendsSleep(allID[(30*(i-1))+p]);
			bot.sendMessage(settings.chatID, 'Added friends: ' + p);
			sleep(2000);
			loggoutSteamClient(msg, i);
		});
	});
}

function addFriendsSleep(line){
	if(client != undefined && (line != undefined && line != null)){
		sleep(500);
		client.addFriend(line, function(err){
			if(err){
				exceptionAddFriends(err);
			}else{
				console.log('Friend added with id ', line);
				bot.sendMessage(settings.chatID, 'Friend added with id ', line);
			}
		});
	}
}

function exceptionAddFriends(err){
	if(String(err) == 'Error: DuplicateName'){
		console.log('Already friends or pending confirmation');
		bot.sendMessage(settings.chatID, 'Already friends or pending confirmation');
	}else if(String(err) == 'Error: Ignored'){
		console.log('You are ignored');
		bot.sendMessage(settings.chatID, 'You are ignored');
	}else if(String(err) == 'Error: Blocked'){
		console.log('You are blocked');
		bot.sendMessage(settings.chatID, 'You are blocked');
	}else{
		console.log(String(err));
		bot.sendMessage(settings.chatID, 'Steam ' + String(err));
	}
}

// Delete Requests to Friends
function deleteRequestFriends(msg, k){
	var allFriends = client.myFriends;
	var i = 0;
	for (var key in allFriends) {
		if(allFriends[key] == 4){
			client.removeFriend(key);
			console.log('Friend request deleted with id ' + key);
			i++;
		}
	}
	console.log('Count of deleted friends: ' + i);
	bot.sendMessage(settings.chatID,'\u{1F3AF} Count of deleted Requests to Friends: ' + i);
	sleep(5000);
	loggoutSteamClient(msg, k);
}

// Spam Friends
function spamFriends(msg, i){
	var allFriends = client.myFriends;
	var countReallFriends = 0;
	var secondsWait = 0;
	for (var key in client.myFriends)
		if(allFriends[key] == 3)
			countReallFriends++;
	if(countMess > 1)
		secondsWait = (countReallFriends * 5) + (countMess * 3 * countReallFriends);
	else
		secondsWait = countReallFriends * 5;
	bot.sendMessage(settings.chatID, 'Count of friends to send a message: ' + countReallFriends);
	bot.sendMessage(settings.chatID, '\u{26A0} Loading, please wait '+ secondsWait + ' seconds');
	console.log('Count of friends to send a message: ' + countReallFriends);
	for (var key in client.myFriends)
		if(allFriends[key] == 3)
			spamFriendsSleep(key, msg);
	bot.sendMessage(msg.chat.id, '\u{2705} Sending end!');
	countOfFriends = 0;
	loggoutSteamClient(msg, i);
}

function spamFriendsSleep(key, msg){
	if(client != undefined){
		var c = 0;
		if(countMess > 1)
			while (c < countMess) {
				client.chatMessage(key, messagesForSend[c]);
				console.log('Send to ' + key + ' mess: ' + messagesForSend[c]);
				sleep(3000);
				c++;
			}
		else{
			client.chatMessage(key, messagesForSend[c]);
			console.log('Send to ' + key + ' mess: ' + messagesForSend[c]);
		}
		countOfFriends++;
		console.log(countOfFriends);
		sleep(5000);
	}
}

// Log Out
async function loggoutSteamClient(msg, i) {
	client.logOff();
	client = undefined;
	console.log('Log out from ' + connect.username);
	bot.sendMessage(settings.chatID, '\u{1F4BE} Log out from ' + connect.username);
	if((parseInt(((allID.length/30)+1), 10)) == i && addFriends1){
		addFriends1 = false;
		addDeleteSpam(msg);
	}else
		connect_GoFunction_Logout(msg, i+1);
}