const WebSocket = require('ws');
const Logger = require('../Util/Logger');

class Socket {
	constructor(parent) {
		Object.assign(this, parent);

		this.socket = new WebSocket.Server({ server: this.server });

		this.socket.on('connection', (client, request) => this.onConnection(client, request));
		this.socket.on('error', (error) => this.onError(error));
		this.socket.on('listening', () => this.onListening());
	}

	getSocket(id) {
		for (let i = 0; i < this.sockets.length; i++) {
			if (this.sockets[i].id === id) {
				return this.sockets[i];
			}
		}

		return null;
	}

	onConnection(client, request) {
		for (let i = 0; i < this.sockets.length; i++) {
			if (request.url.startsWith(this.sockets[i].route)) {
				this.sockets[i].onConnection(client, request);

				break;
			}

			if (i + 1 === this.sockets.length) {
				client.close(1000, 'No socket routes available to handle this request');
			}
		}
	}

	onError(error) {
		Logger.error(error);
	}

	onListening() {
		Logger.info('WebSocket server is listening.');
	}
}

module.exports = Socket;