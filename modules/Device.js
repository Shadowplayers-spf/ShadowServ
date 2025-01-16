/*
	Socket IO devices
*/
import DB from "./DB.js";
import User from "./User.js";

/*
	This is used for games/books we have available on site.
	See ShopItem for the store.
*/
export default class Inventory extends DB{

	static table = "devices";

	static TYPES = {
		SmartSwitch : 'SmartSwitch',
	};

	constructor(){
		super(...arguments);

		this.name = 'Unnamed Device';
		this.deviceid = '';
		this.type = Inventory.TYPES.SmartSwitch;
		this.created = '';
		this.updated = '';
		this.config = {};
		this.status = {};
		this.last_seen = 0;

		this.load(...arguments);
	}

	

	// restUserId = user in a rest call. Needed because it should return the loaned by user if they're the same that's loaning this
	async getOut( admin = false ){

		const out = {
			id : this.id,
			name : this.name,
			type : this.type,
			created : this.created,
			updated : this.updated,
			config : this.config,
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
		return TYPES[type] !== undefined;
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
