

export default class Scanner{

	constructor(){
		
		this.enabled = false;
		this.context = null;
		this.video = null;

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
		this.enabled = false;
		this.video.srcObject.getTracks().forEach(track => {
			if( track.readyState === "live" )
				track.stop();
		});
		Quagga.stop();

	}

	frame(){
		
		if( !this.enabled )
			return;
		this.context.drawImage(this.video, 0, 0);
		window.requestAnimationFrame(this.frame.bind(this));

	}

	async run( pm, onDetected ){

		
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
		
		Quagga.onDetected(data => {
			pm.setModal(); // Closes out quagga
			onDetected(data.codeResult);
			/*
				Useful data in callback:
				code : (str)output,
				format : (str)code_format ex "ean_13"
			*/
		});

	}

}

