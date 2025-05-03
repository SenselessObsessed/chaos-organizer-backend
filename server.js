const http = require('http');
const path = require('path');
const fs = require('fs');
const public = path.join(__dirname, '/public');

const Koa = require('koa');
const { koaBody } = require('koa-body');
const Router = require('koa-router');
const uuid = require('uuid');
const cors = require('@koa/cors');
const koaStatic = require('koa-static');

const app = new Koa();
app.use(
	koaBody({
		json: true,
		multipart: true,
		urlencoded: true,
	})
);
const router = new Router();
app.use(cors());
app.use(koaStatic(public));
app.use(router.routes()).use(router.allowedMethods());

const chats = [];

function formatTime() {
	const date = new Date();
	const options = {
		hour: 'numeric',
		minute: 'numeric',
		day: 'numeric',
		month: 'numeric',
		year: 'numeric',
	};

	const formattedDate = date.toLocaleDateString('ru-RU', options);
	return formattedDate;
}

router.post('/api/init-chat', async ctx => {
	const idNewChat = uuid.v4();
	chats.push({
		id: idNewChat,
		pin: null,
		messages: [],
	});

	ctx.response.body = { Status: true, id: idNewChat };
});

router.post('/api/add-text-message', async ctx => {
	const { id: chatId, star, crypto, body, pinned } = ctx.request.body;
	const newId = uuid.v4();

	const findChat = chats.findIndex(chat => chat.id === chatId);
	const time = formatTime();
	chats[findChat].messages.push({
		type: 'text',
		id: newId,
		star: star,
		crypto: crypto,
		body: body,
		pinned: pinned,
		time: time,
	});
	ctx.response.body = { Status: true, id: newId, time: time };
});

router.post('/api/add-file', async ctx => {
	const { filepath, originalFilename } = ctx.request.files.file;
	const { chatId, type } = ctx.request.body;
	const time = formatTime();

	if (type !== 'file') {
		const file = fs.readFileSync(filepath);
		const id = uuid.v4();
		const nameFileWithSplit = originalFilename.split('.');
		const extension = nameFileWithSplit[nameFileWithSplit.length - 1];
		fs.writeFileSync(`./public/${id}.${extension}`, file, 'binary');

		const findChatId = chats.findIndex(chat => chat.id === chatId);
		chats[findChatId].messages.push({
			type: type,
			time: time,
			id: id,
			body: `${id}.${extension}`,
		});

		const formatDate = formatTime();
		ctx.response.body = {
			Status: true,
			idMessage: id,
			extension: extension,
			time: formatDate,
		};
	} else {
		const file = fs.readFileSync(filepath);
		const id = uuid.v4();
		fs.writeFileSync(`./public/${originalFilename}`, file, 'binary');
		const findChatId = chats.findIndex(chat => chat.id === chatId);
		chats[findChatId].messages.push({
			type: type,
			time: time,
			id: id,
			body: `${originalFilename}`,
		});

		const formatDate = formatTime();
		ctx.response.body = {
			Status: true,
			id: id,
			idMessage: originalFilename,
			time: formatDate,
		};
	}
});

router.put('/api/add-star', async ctx => {
	const { idChat, idMessage } = ctx.request.body;

	const findChatId = chats.findIndex(chat => chat.id === idChat);
	const msgId = chats[findChatId].messages.findIndex(
		msg => msg.id === idMessage
	);
	chats[findChatId].messages[msgId].star = true;

	ctx.response.body = { Status: true };
});

router.put('/api/remove-star', async ctx => {
	const { idChat, idMessage } = ctx.request.body;

	const findChatId = chats.findIndex(chat => chat.id === idChat);
	const msgId = chats[findChatId].messages.findIndex(
		msg => msg.id === idMessage
	);
	chats[findChatId].messages[msgId].star = false;

	ctx.response.body = { Status: true };
});

router.put('/api/add-pin', async ctx => {
	const { idChat, idMessage, previousPinId } = ctx.request.body;

	const findChatId = chats.findIndex(chat => chat.id === idChat);
	const msgId = chats[findChatId].messages.findIndex(
		msg => msg.id === idMessage
	);
	chats[findChatId].pin = idMessage;
	chats[findChatId].messages[msgId].pinned = true;

	if (previousPinId) {
		const msgIdPrevious = chats[findChatId].messages.findIndex(
			msg => msg.id === previousPinId
		);

		chats[findChatId].messages[msgIdPrevious].pinned = false;
	}

	ctx.response.body = { Status: true };
});

router.put('/api/remove-pin', async ctx => {
	const { idChat, idMessage } = ctx.request.body;

	const findChatId = chats.findIndex(chat => chat.id === idChat);
	const msgId = chats[findChatId].messages.findIndex(
		msg => msg.id === idMessage
	);
	chats[findChatId].pin = null;
	chats[findChatId].messages[msgId].pinned = false;

	ctx.response.body = { Status: true };
});

router.get('/api/search-messages/:idChat/:value', async ctx => {
	const { idChat, value } = ctx.request.params;
	const currChatIdx = chats.findIndex(chat => chat.id === idChat);

	const messagesText = chats[currChatIdx].messages.filter(
		msg => msg.type === 'text'
	);
	const resultArr = messagesText.filter(msg => msg.body.startsWith(value));
	ctx.response.body = resultArr;
});

router.get('/api/:idChat/all-star', async ctx => {
	const { idChat } = ctx.request.params;
	const currChatIdx = chats.findIndex(chat => chat.id === idChat);
	const result = chats[currChatIdx].messages.filter(msg => msg.star === true);

	ctx.response.body = result;
});

router.get('/api/:idChat/all-audio', async ctx => {
	const { idChat } = ctx.request.params;
	const currChatIdx = chats.findIndex(chat => chat.id === idChat);
	const result = chats[currChatIdx].messages.filter(
		msg => msg.type === 'audio'
	);

	ctx.response.body = result;
});

router.get('/api/:idChat/all-images', async ctx => {
	const { idChat } = ctx.request.params;
	const currChatIdx = chats.findIndex(chat => chat.id === idChat);
	const result = chats[currChatIdx].messages.filter(
		msg => msg.type === 'image'
	);

	ctx.response.body = result;
});

router.get('/api/:idChat/all-video', async ctx => {
	const { idChat } = ctx.request.params;
	const currChatIdx = chats.findIndex(chat => chat.id === idChat);
	const result = chats[currChatIdx].messages.filter(
		msg => msg.type === 'video'
	);

	ctx.response.body = result;
});

router.get('/api/:idChat/all-files', async ctx => {
	const { idChat } = ctx.request.params;
	const currChatIdx = chats.findIndex(chat => chat.id === idChat);
	const result = chats[currChatIdx].messages.filter(msg => msg.type === 'file');

	ctx.response.body = result;
});

router.get('/api/import/:id/:messageId', async ctx => {
	const { id, messageId } = ctx.request.params;
	const currChat = chats.findIndex(chat => chat.id === id);

	if (currChat !== -1) {
		if (messageId === 'null') {
			const chatLen = chats[currChat].messages.length;
			if (chatLen === 0) {
				ctx.response.body = {
					status: true,
					pinId: null,
					messages: [],
					pinBody: null,
				};
			} else if (chatLen < 10) {
				let pinBody, pinId;
				if (chats[currChat].pin) {
					pinId = chats[currChat].pin;
					const findIdxPin = chats[currChat].messages.findIndex(
						msg => msg.id === chats[currChat].pin
					);
					pinBody = chats[currChat].messages[findIdxPin].body;
				} else {
					pinBody = null;
					pinId = null;
				}
				ctx.response.body = {
					status: true,
					pinId: pinId,
					messages: chats[currChat].messages,
					pinBody: pinBody,
				};
			} else {
				let pinBody, pinId;
				if (chats[currChat].pin) {
					pinId = chats[currChat].pin;
					const findIdxPin = chats[currChat].messages.findIndex(
						msg => msg.id === chats[currChat].pin
					);
					pinBody = chats[currChat].messages[findIdxPin].body;
				} else {
					pinBody = null;
					pinId = null;
				}

				const lastTenMsgs = chatLen - 10;
				const result = chats[currChat].messages.slice(lastTenMsgs);

				ctx.response.body = {
					status: true,
					pinId: pinId,
					messages: result,
					pinBody: pinBody,
				};
			}
		} else {
			const msgNum = chats[currChat].messages.findIndex(
				msg => msg.id === messageId
			);
			if (msgNum === 0) {
				ctx.response.body = { status: true, messages: [] };
			} else if (msgNum < 10) {
				const messages = chats[currChat].messages.slice(0, msgNum);
				ctx.response.body = { status: true, messages: messages };
			} else {
				const messages = chats[currChat].messages.slice(msgNum - 10, msgNum);
				ctx.response.body = { status: true, messages: messages };
			}
		}
		// TODO
	} else {
		ctx.response.body = { status: false };
	}
});

const port = process.env.PORT || 7070;
http.createServer(app.callback()).listen(port);
