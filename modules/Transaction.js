import DB from "./DB.js";
import User from "./User.js";

export default class SwishTransaction extends DB{

	static table = 'swish_transactions';

	static STATUS_PAID = 'PAID';
	static STATUS_FAILED = 'FAILED';
	static STATUS_PENDING = 'PENDING';

    constructor(){

        super(...arguments);

		this.id = 0;
		this.user = 0;
		this.uuid = '';
		this.created = '';
		this.updated = '';
		this.status = SwishTransaction.STATUS_PENDING;
        
		this.load(...arguments);

    }

	static async create( user, uuid ){

		if( user instanceof User )
			user = user.id;
		user = Math.trunc(user);
		if( !user )
			throw new Error("Unable to create transaction: Invalid user.");
		uuid = String(uuid);
		if( !uuid.length )
			throw new Error("Unable to create transaction: Invalid UUID.");

		let out = new this({
			user,
			uuid
		});

        const q = await this.query("INSERT INTO "+this.table+" (user, uuid, status) VALUES (?,?)", [user, uuid, out.status]);
		out.id = q.insertId;

		return out;

	}

}




