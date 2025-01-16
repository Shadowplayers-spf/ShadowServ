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

		this.load(...arguments);
	}

	// Use this
	getConfig(){

		let tmpConf = new DeviceConfig(this, this.config);
		return tmpConf.getOut();

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
export class DeviceConfig{

	static ON_DUR = 3600e3*6; // on for 3h

	static Prototypes = {
		[Device.TYPES.SmartSwitch] : {
			// User settable
			active : true,		// when false, turn off until manually turned on again
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

	}

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
			let currentDay = new Date().getDay()-1;
			if( currentDay < 0 )
				currentDay = 6;
			let currentHour = new Date().getHours();

			const override = Math.trunc(this.data.override) || 0;

			// Calculate when the next on should be
			let nextOn = 0;
			let nextDur = 0;
			if( out.active ){

				console.log("override", this.data.override, Date.now()-override, DeviceConfig.ON_DUR);
				if( override > 0 && Date.now()-override < DeviceConfig.ON_DUR ){
					nextOn = override-Date.now(); // Negative to turn into "started n ms ago"
					nextDur = DeviceConfig.ON_DUR;
				}
				else{

					// Check weekly
					for( let obj of out.weekly ){
						
						let day = Math.trunc(obj.day) || 0;
						let hour = Math.trunc(obj.hour) || 0;
						if( day < currentDay )
							day += 7; // Make sure the day is not in the past
						day -= currentDay; // Creates an offset from 0-6
						hour -= currentHour; // 
						let startOffs = day*3600e3*24 + hour*3600e3;
						// This one has expired, add a week to it
						if( startOffs < -DeviceConfig.ON_DUR )
							startOffs += 3600e3*24*7;

						if( 
							// If either is positive, use the lowest value
							((startOffs > 0 || nextOn > 0) && startOffs < nextOn) ||
							// If both are in the past, use the most recent
							(startOffs < 0 && nextOn < 0 && Math.abs(startOffs) < Math.abs(nextOn))
						){
							nextOn = startOffs;
							nextDur = DeviceConfig.ON_DUR;
						}

					}

				}
			}
			out.a_NextOn = nextOn;
			out.a_Dur = nextDur;

		}

		return out;
		

	}

}

