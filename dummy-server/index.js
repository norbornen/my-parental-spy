// @ts-check

const zlib = require('zlib');
const util = require('util');
const stream = require('stream');

const pipe = util.promisify(stream.pipeline);


const fastify = require('fastify')({ logger: true });
fastify.register(require('fastify-cors'));
//fastify.register(require('fastify-formbody'));
//fastify.register(require('fastify-compress'));

fastify.post('/api/v1/sync', async (request, reply) => {
	console.log(request.body);
	console.log(request.body.length);
	console.log(request.headers);
	console.log(request.query);
	
	
	// console.log(request);
	// console.log(request.headers);
	
	try {
		const b = Buffer.from(request.body, 'base64')
		console.log( zlib.gunzipSync(b).toString() );
		console.log( zlib.gunzipSync(b).toString().length );
		
		console.log('--');
	} catch (err) {
		console.error(err);
	}

	// try {
	// 	const w = new stream.Writable({
	// 		// defaultEncoding: 'base64'
	// 	});
	// 	const z = await pipe(request.raw, zlib.createGunzip(), w);
	// 	console.log(w);
		

	// 	// const gunzip = zlib.createGunzip();
	// 	// request.raw.pipe(gunzip);
	// 	// gunzip.on('data', c => console.log(`${c}`));
	// 	// gunzip.on('error', console.error);



	// 	// const z = await util.promisify(zlib.createGunzip)(request.body);
	// 	// console.log('res=', z);
	// } catch (err) {
	// 	console.error(err);
	// }
	
	

//	console.log(await util.promisify(zlib.gunzip)(request.body));

//	reply.code(406);
// return {error: 'something wrong'};
	reply.code(204);
	// return {ok: 1};
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

