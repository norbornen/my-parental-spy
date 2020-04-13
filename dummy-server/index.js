// @ts-check

const zlib = require('zlib');
const util = require('util');

const fastify = require('fastify')({ logger: true });
fastify.register(require('fastify-cors'));
//fastify.register(require('fastify-formbody'));
//fastify.register(require('fastify-compress'));

fastify.post('/api/v1/sync', async (request, reply) => {
	console.log(request.body);

//	console.log(await util.promisify(zlib.gunzip)(request.body));

	console.log(request.body.length);
/*
	reply.code(406);
	return {error: `dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa dsdsddsdsdssddssd aaa
	`};
*/
//	reply.code(406);
	reply.code(204);
	return {error: 'something wrong'};
});

(async () => {
	try {
		await fastify.listen( 16010 );
		// @ts-ignore
		fastify.log.info(`server listening on ${fastify.server.address().port}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
})();

