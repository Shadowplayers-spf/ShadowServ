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
					task = data.task,
					args = data.args
				;
				if( !Array.isArray(args) ){
					args = [];
				}

				this.handleDeviceTask(socket, devid, task, args)
				.then(data => {
					callback({
						success : true,
						data
					});
				})
				.catch(err => {
					console.error(err);
					callback({
						success : false,
						data : err && err.message !== undefined ? err.message : err
					});
				});

			});

		});

	}

	async handleDeviceTask( socket, devid, task, args ){

		const fn = this['dev'+task];
		if( !fn )
			throw new Error("Received invalid task: "+task);

		// Auto insert the device if needed
		let device = await Device.get({deviceid:devid}, 1);
		if( !device ){
			if( !Device.isValidId(devid) )
				throw new Error("Invalid device ID supplied");
			if( !Device.isValidType(type) )
				throw new Error("Invalid device type supplied");

			// Need to insert
			device = new Device({
				devid,
				type
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
			throw new Error("Invalid data supplied to SetStatus");

		device.status = data;
		await device.saveOrInsert();
		// Todo: emit to app rooms
		return true;

	}

	async devGetConfig( device ){
		return {
			config : device.config
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

