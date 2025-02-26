/*
	Socket IO devices
*/
import DB from "./DB.js";
import User from "./User.js";

/*
	This is used for games/books we have available on site.
	See ShopItem for the store.
*/
export default class Device extends DB{

	static table = "devices";

	// Note: needs to be mirrored in public/classes/Device.js
	static TYPES = {
		SmartSwitch : 'SmartSwitch',
	};

	constructor(){
		super(...arguments);

		this.name = 'Unnamed Device';
		this.deviceid = '';
		this.type = Device.TYPES.SmartSwitch;
		this.created = '';
		this.updated = '';
		this.config = {}; // use getConfig
		this.status = {};
		this.last_seen = 0;
		this.active = true;			// Whether the device should be doing its thing. Lets you stop a device entirely.

		this.load(...arguments);
	}

	// Use this
	getConfig(){

		let tmpConf = new DeviceConfig(this, this.config);
		return tmpConf.getOut();

	}

	// Returns a smaller config with only required stuff for the device
	getConfigSocket(){

		let tmpConf = new DeviceConfig(this, this.config);
		let cnf = tmpConf.getOut();
		let out = {};

		if( this.type === Device.TYPES.SmartSwitch ){
			out.a_Dur = cnf.a_Dur;
			out.a_NextOn = cnf.a_NextOn;
		}


		return out;

	}


	async setConfig( config = {}, save = true ){

		// Allows us to send partial configs and only affect the ones sent
		let out = structuredClone(this.config);
		for( let i in config )
			out[i] = config[i];

		let cfg = new DeviceConfig(this, out);
		this.config = cfg.getSaveData();
		if( save )
			await this.saveOrInsert();

	}
	

	// restUserId = user in a rest call. Needed because it should return the loaned by user if they're the same that's loaning this
	async getOut( admin = false ){

		
		const out = {
			id : this.id,
			name : this.name,
			type : this.type,
			created : this.created,
			updated : this.updated,
			config : this.getConfig(),
			status : this.status,
			last_seen : this.last_seen,
			active : this.active,
		};

		if( admin ){

		}

		//console.log("USR out", out._holder, "this", this.id, "holder", this.holder, "restuserid", restUserId);
		return out;

	}

	// Called on disconnect
	async resetLastSeen(){
		this.last_seen = 0;
		await this.query("UPDATE "+this.constructor.table+" SET last_seen=0 WHERE id=?", [this.id]);
	}

	async updateLastSeen(){
		this.last_seen = Math.floor(Date.now()/1000);
		await this.query("UPDATE "+this.constructor.table+" SET last_seen=UNIX_TIMESTAMP() WHERE id=?", [this.id]);
	}

	// Saves changes or inserts a new one if this.id = 0
	async saveOrInsert(){

		if( !this.deviceid ){
			throw new Error("DeviceID required to insert a new device");
		}

		if( !this.id ){
			const q = await this.query("INSERT INTO "+this.constructor.table+" (deviceid, type) VALUES (?,?)", [this.deviceid, this.type]);
			this.id = q.insertId;
		}

		await this.query("UPDATE "+this.constructor.table+" SET name=?, deviceid=?, status=?, name=?, config=? WHERE id=?", [
			this.name, this.deviceid, JSON.stringify(this.status), this.name, JSON.stringify(this.config), this.id
		]);

	}

	/*
        Gets a list of all devices
    */
	static async getAll(){

		return await this.get({});

	}

	static async getOnline(){
		const rows = await this.query("SELECT * from "+this.table+" WHERE last_seen > UNIX_TIMESTAMP()-3600 ORDER BY name");
		return rows.map(el => new this(el));
	}

	static isValidType( type ){
		return this.TYPES[type] !== undefined;
	}
	static isValidId(id){

		if( typeof id !== "string" )
			return false;
		if( id.length < 16 )
			return false;
		if( id.length > 32 )
			return false;
		return id.match(/^[a-z0-9]+$/i);

	}


}


// Helps generate proper config data based on device type
// Note that device config should only be for individual device types. If a property should be avialable for ALL devices, set it as a device table property instead.
export class DeviceConfig{

	static ON_DUR = 3600e3*6; // on for 3h

	static Prototypes = {
		[Device.TYPES.SmartSwitch] : {
			// User settable
			weekly : [],		// objects of {day:0-6 (0=monday), hour:0-23}
			override : 0,		// Time when we last did an override. Override lasts for 6 hours.
			// Automatic (prefix these with a_ to indicate automatic)
			a_NextOn : 0,		// time in MS until next turn on
			a_Dur : 0,			// time in MS until to be on.
		}
	};

	constructor( parent, data ){

		this.parent = parent;
		if( !data || typeof data !== "object" )
			data = {};
		this.data = structuredClone(data);
		for( let i in data ){
			if( typeof data[i] === "string" && data[i].includes("%UTIME%") ){
				if( data[i] === "%UTIME%" )
					this.data[i] = Date.now();
				else
					this.data[i] = this.data[i].replace("%UTIME%", Date.now());
			}
		}

	}

	// Sanitizes data to be sent to DB
	getSaveData(){

		const def = DeviceConfig.Prototypes[this.parent.type];
		if( !def ){
			console.error("Note: Missing config prototype for device type", this.parent.type);
			return {};
		}
		let template = structuredClone(def);
		for( let i in this.data )
			template[i] = this.data[i];

		// Remove auto generated config
		let out = {};
		for( let i in template ){
			if( !i.startsWith("a_") )
				out[i] = template[i];
		}
		return out;

	}

	// Converts sunday first to monday first
	getCurrentDay(){
		let currentDay = new Date().getDay()-1;
		if( currentDay < 0 )
			currentDay = 6;
		return currentDay;
	}
	getCurrentHour(){
		return new Date().getHours();
	}

	// Get data to send to the device
	getOut(){

		const def = DeviceConfig.Prototypes[this.parent.type];
		if( !def )
			return this.data;
		let out = structuredClone(def);
		for( let i in this.data )
			out[i] = this.data[i];

		// Handle auto keys
		if( this.parent.type === Device.TYPES.SmartSwitch ){
			
			// Monday first
			let currentDay = this.getCurrentDay();
			let currentHour = this.getCurrentHour();

			const override = Math.trunc(this.data.override) || 0;

			// Calculate when the next on should be
			let nextOn = undefined;
			let nextDur = 0;
			if( this.parent.active ){

				if( override > 0 && Date.now()-override < DeviceConfig.ON_DUR ){
					nextOn = override-Date.now(); // Negative to turn into "started n ms ago"
					nextDur = DeviceConfig.ON_DUR;
				}
				else{

					let blk = false;

					// Check weekly
					for( let obj of out.weekly ){
						
						let day = Math.trunc(obj.day) || 0;
						let hour = Math.trunc(obj.hour) || 0;
						
						if( day < currentDay )
							day += 7; // Make sure the day is not in the past
						day -= currentDay; // Creates an offset from 0-6
						hour -= currentHour; // Creates an offset
						
						let startOffs = day*3600e3*24 + hour*3600e3;
						// This one has expired, add a week to it
						if( startOffs < -DeviceConfig.ON_DUR )
							startOffs += 3600e3*24*7;

						startOffs -= (Date.now() % 3600e3); // Takes millis since top of hour into consideration to give an exact time
						
						if(
							nextOn === undefined ||
							// If both block are started (overlapping blocks), we go with the most recent one
							(nextOn < 0 && startOffs < 0 && Math.abs(startOffs) < Math.abs(nextOn) ) ||
							// Otherwise if we have a positive next start time (unstarted), we just check if the incoming one is smaller
							(nextOn >= 0 && startOffs < nextOn)
						 ){
							nextOn = startOffs;
							nextDur = DeviceConfig.ON_DUR;
							blk = obj;
						}
						
					}

					// It's on. We should check if there's a block within a distance, just to bridge the gap
					if( nextOn <= 0 ){


						let blkDay = Math.trunc(blk.day) || 0;
						let blkHour = Math.trunc(blk.hour) || 0;
						let blkDayEnd = (blkDay + ((blk.hour + DeviceConfig.ON_DUR/3600e3) >= 24))%7;
						let blkHourEnd = (blk.hour + DeviceConfig.ON_DUR/3600e3)%24;

						// Is there a block within this timeframe?
						for( let obj of out.weekly ){
							// Skip self
							if( obj === blk )
								continue;
							let oDay = Math.trunc(obj.day) || 0;
							let oHour = Math.trunc(obj.hour) || 0;
							const dayIsCorrect = blkDay === oDay || blkDayEnd === oDay; // Day can only be one of two, since we don't do +24h on times. Though this has to change if you for some reason would
							const hourIsCorrect = 
								(blkHourEnd < blkHour && oHour >= blkHourStart && oHour <= blkHourEnd ) ||
								(blkHourEnd > blkHour && oHour >= blkHour && oHour <= blkHourEnd );
							if( dayIsCorrect && hourIsCorrect ){
								nextDur += 3600e3; // Add an extra hour to bridge the gap. The device can request updates in this hour.
								break;
							}


						}

					}

				}
			}
			out.a_NextOn = nextOn;
			out.a_Dur = nextDur;

			//console.log("nextOn", nextOn, "dur", nextDur);

		}

		return out;
		

	}


}

