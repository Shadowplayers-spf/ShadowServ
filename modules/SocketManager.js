import DB from "./DB.js";
import Device from "./Device.js";

export default class SocketManager{

	constructor( io ){

		this.io = null;
		

	}

	async begin(io){
		this.io = io;

		await DB.query("UPDATE devices SET last_seen=0"); // Reset online status
		
		this.io.on('connection', socket => {
			
			console.log("User connected");
			socket.on('disconnect', () => {

				console.log("User disconnected");

				// A device disconnected
				if( socket.data.deviceid )
					this.onDeviceDisconnect(socket).catch(err => {});

			});
			/*
				Device tasks are sent by the physical device to server. Data is:
				{
					id : (str)deviceID,
					task : (str)task,
					args : (arr)args
				}
			*/
			socket.on('deviceTask', (data, callback) => {
				if( typeof data !== "object" || !data )
					return;

				let devid = data.id,
					devtype = data.type,
					task = data.task,
					args = data.args
				;
				if( !Array.isArray(args) ){
					args = [];
				}

				// Device might not support callbacks
				if( typeof callback !== "function" )
					callback = data => {
						socket.emit(task, data);
					};

				this.handleDeviceTask(socket, devid, devtype, task, args)
				.then(data => {
					callback({
						success : true,
						data
					});
				})
				.catch(err => {
					console.error("Caught device error", err);
					callback({
						success : false,
						data : err && err.message !== undefined ? err.message : err
					});
				});

			});

		});

	}

	async handleDeviceTask( socket, devid, devtype, task, args ){

		const fn = this['dev'+task];
		if( !fn )
			throw new Error("Received invalid task: "+task);

		// Auto insert the device if needed
		let device = await Device.get({deviceid:devid}, 1);
		if( !device ){
			if( !Device.isValidId(devid) )
				throw new Error("Invalid device ID supplied");
			if( !Device.isValidType(devtype) )
				throw new Error("Invalid device type supplied");

			// Need to insert
			device = new Device({
				deviceid : devid,
				type : devtype
			});
			await device.saveOrInsert();

		}

		// First task
		if( !socket.data.id ){
			socket.data.id = device.id;
			socket.data.deviceid = devid;
			socket.join("dev__"+device.id); // Make sure it's in the device room
		}
		const out = await fn.call(this, device, ...args)
		await device.updateLastSeen();
		return out;

	}

	async getDeviceBySocket( socket ){
		return await Device.get(socket.data.id, 1);
	}

	async onDeviceDisconnect( socket ){

		const device = await this.getDeviceBySocket(socket);
		if( !device )
			return false;
		await device.resetLastSeen();

	}

	async devSetStatus( device, data ){

		if( typeof data !== "object" || !data )
			throw new Error("Invalid data supplied to SetStatus: "+(typeof data));

		device.status = data;
		await device.saveOrInsert();
		// Todo: emit to app rooms
		return true;

	}

	async devGetConfig( device ){
		return {
			config : device.getConfig()
		};
	}


	// From app to device
	async appSendToDevice( device, task, data ){

		if( !(device instanceof Device) ){
			throw new Error("Device must be of type Device in appSendToDevice");
		}

		this.io.to("dev__"+device.id).emit(task, data);


	}








}

