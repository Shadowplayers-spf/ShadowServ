

export default class Scanner{

	constructor(){
		
		this.enabled = false;
		this.context = null;
		this.video = null;
		this.init = false;
		this._onKeydown = event => {};

	}

	async initCamera( video ){

		const constraints = {
			video : {
				width : { min: 1280 },
				height : { min:720 },
				facingMode : "environment"
			}
		};

		const media = await navigator.mediaDevices.getUserMedia(constraints);
		return await new Promise((res, rej) => {

			video.srcObject = media;
			video.onloadedmetadata = () => {
				video.play();
				res();
			};

		});


	}

	async close(){

		console.log("Close");
		document.body.removeEventListener("keydown", this._onKeydown);
		this.enabled = false;
		this.video.srcObject.getTracks().forEach(track => {
			if( track.readyState === "live" )
				track.stop();
		});
		try{
			Quagga.stop();
		}catch(err){} // not nice, but fuckit
	}

	frame(){
		
		if( !this.enabled )
			return;
		this.context.drawImage(this.video, 0, 0);
		window.requestAnimationFrame(this.frame.bind(this));

	}

	/*
		Useful data in callback:
		code : (str)output,
		format : (str)code_format ex "ean_13"
	*/
	onDetected( data ){

		console.log("OnDetected", data);
		pm.setModal(); // Closes out quagga
		this._onDetected(data.codeResult || data);

	}

	// scanImage can be set to true to disable quagga and enable space key to call onDetected
	// 
	async run( pm, onDetected, scanImage = false ){

		document.body.removeEventListener("keydown", this._onKeydown);
		const video = document.createElement('video');
		this.video = video;
		video.classList.add("hidden");
		const canvas = document.createElement('canvas');
		canvas.classList.add("scanner");
		await this.initCamera(video);

		const div = document.createElement('div');
		div.classList.add('viewport');
		div.appendChild(video);
		div.appendChild(canvas);
		pm.setModal(div, false, false, this.close.bind(this));

		canvas.setAttribute('width', video.videoWidth);
		canvas.setAttribute('height', video.videoHeight);
		this.context = canvas.getContext("2d");
		

		this.enabled = true;
		this.frame();

		if( !scanImage ){

			Quagga.init({
				inputStream : {
					name : 'Live',
					type : 'LiveStream',
					target : canvas
				},
				decoder : {
					readers : [
						"ean_reader"
					]
				}
			},
			err =>{
				if( err ){
					console.error(err);
					return;
				}
				console.log("Quagga initialized");
				Quagga.start();
			});
			
		}
		else{

			this._onKeydown = event => {

				if( event.key !== " " )
					return;
				event.preventDefault();
				this.onDetected(canvas);

			};
			document.body.addEventListener('keydown', this._onKeydown);

		}
		this._onDetected = onDetected;

		if( !this.init && !scanImage ){

			console.log("Binding onDetected to quagga");
			this.init = true;
			Quagga.onDetected(this.onDetected.bind(this));

		}

	}

}

