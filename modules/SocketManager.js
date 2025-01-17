import DB from "./DB.js";
import Device from "./Device.js";
import User from "./User.js";

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

			/*
				These are sent by the client app.
				{
					task : (str)task,
					args : (arr)args
				}
			*/
			socket.on('clientTask', (data, callback) => {

				if( typeof data !== "object" || !data )
					return;

				let task = data.task,
					args = data.args
				;
				this.handleClientTask(socket, task, args, callback);

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

	async handleClientTask( socket, task, args, callback ){

		try{
			if( task !== "Join" && !socket.data.admin )
				throw new Error("Access denied");
			let fn = this['cli'+task];
			if( !fn )
				throw new Error("Received invalid task: "+task);
			let out = await fn.call(this, socket, ...args);
			if( typeof callback === "function" )
				callback({
					success : true,
					data : out
				});

		}catch(err){
			console.error("Caught clientTask error", err);
			if( typeof callback === "function" )
				callback({
					success : false,
					data : err && err.message !== undefined ? err.message : err
				});
			return;
		}

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



	/* Endpoint for physical devices */
	async devSetStatus( device, data ){

		if( typeof data !== "object" || !data )
			throw new Error("Invalid data supplied to SetStatus: "+(typeof data));

		device.status = data;
		await device.saveOrInsert();
		this.appRefreshAdmins();
		return true;

	}

	async devGetConfig( device ){
		return {
			config : device.getConfig(),
			active : device.active
		};
	}


	/*
		Endpoint for frontend
	*/
	async cliJoin( socket, loginToken ){

		const user = await User.get({session_token:loginToken}, 1);
		if( !user || !user.exists() )
			throw new Error("Invalid login token");
		if( !user.isAdmin() )
			throw new Error("Access denied");

		socket.data.admin = true;
		// join admin room
		socket.join("admin");

		return true;

	}




	/*
		Internal for Rest/ShadowServ to access
	*/

	// From app to device
	appSendToDevice( device, task, data ){

		if( !(device instanceof Device) ){
			throw new Error("Device must be of type Device in appSendToDevice");
		}

		this.io.to("dev__"+device.id).emit(task, {
			success : true,
			data
		});


	}

	appSendDeviceConfig( device ){

		if( !(device instanceof Device) ){
			throw new Error("Device must be of type Device in appSendToDevice");
		}

		this.appSendToDevice(device, "GetConfig", {
			config : device.getConfig()
		});
		this.appRefreshAdmins({
			// Note that these are currently ignored, the page refreshes all devices
			type : "Device",
			id : device.id
		});


	}

	appRefreshAdmins(data){
		this.io.to("admin").emit("RefreshAdmins", data || {});
	}








}

