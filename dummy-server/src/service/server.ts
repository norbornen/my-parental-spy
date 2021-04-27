import { EventEmitter } from 'events';
import fastify from 'fastify';
import { default as fastifyCors } from 'fastify-cors';
import { boundMethod } from 'autobind-decorator';

const SYNC_INCOMING: fastify.RouteShorthandOptions = {
	schema: {
		headers: {
			type: 'object',
			properties: {
			  'x-uid': { type: 'string' }
			},
			required: ['x-uid']
		},
		params: {
			sign: { type: 'string' }
		}
	}
};

export default class ServerService extends EventEmitter {
	private server!: fastify.FastifyInstance;

	constructor(private readonly port: number = 16010) {
		super();
		process.nextTick(this.init);
	}

	@boundMethod
	private async init() {
		this.server = fastify({ logger: true }).register(fastifyCors);

		this.routeSync();

		try {
			await this.server.listen(this.port);
		} catch (err) {
			this.server.log.error(err);
			throw new Error(err);
		}
	}

	public async destroy() {
		this.removeAllListeners();
		try {
			await this.server.close();
		} catch (err) {
			console.error(err);
		}
	}

	private routeSync() {
		this.server.post('/api/v1/sync', SYNC_INCOMING, async (request, reply) => {
			reply.code(204);
			this.emit('sync', request.headers['x-uid'], request.body, request.query.sign);
		});
	}

}
