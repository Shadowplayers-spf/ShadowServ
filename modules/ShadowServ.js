import express from 'express';

export default class ShadowServ{
	
	constructor( port = 80 ){

		console.log("IT BEGINS!");
		this.app = express();
		this.port = port;

	}
	
	begin(){
		this.app.use(express.static('public'));
		this.app.listen(this.port, () => {
			console.log(`ShadowServ online on port ${this.port}`)
		});
	}

}

