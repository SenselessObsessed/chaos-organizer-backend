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

const WS = require('ws');

const app = new Koa();
const router = new Router();
app.use(
	koaBody({
		urlencoded: true,
		multipart: true,
		json: true,
	})
);
app.use(koaStatic(public));
app.use(cors());
app.use(router.routes()).use(router.allowedMethods());

const chats = [
	{
		id: 3,
		pin: 40, // id Message or null
		messages: [
			{
				type: 'text',
				id: uuid.v4(),
				star: true, // favorites
				crypto: false, // crypto message
				body: 'Hello World',
			},
			{
				type: 'img',
				id: uuid.v4(),
				body: 'cat.jpg',
			},
			{
				type: 'audio',
				id: uuid.v4(),
				body: 'audio.mp3',
			},
			{
				type: 'video',
				id: uuid.v4(),
				body: 'video.mp4',
			},
		],
	},
];

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

// add logic
router.put('/api/add-pin', async ctx => {
	console.log(chats);
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

// add logic
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

router.get('/api/import/:id', async ctx => {
	const { id } = ctx.request.params;
	const currChat = chats.findIndex(chat => chat.id === id);
	if (currChat !== -1) {
		ctx.response.body = chats[currChat].messages;
	} else {
		ctx.response.status = 404;
		ctx.response.body = 'Not found chat';
	}
});

const port = process.env.PORT || 7070;
http.createServer(app.callback()).listen(port);
