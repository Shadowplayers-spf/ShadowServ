import DB from "./DB.js";
import Swish from "./Swish.js";
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

	// Refreshes from Swish API. If this was just paid, it returns the amount paid in SEK. Optionally accepts a mysql connection with a begun transaction to make sure everything else works.
	async refresh( transaction ){

		const data = await Swish.getInvoice(this.uuid);
		const status = data.status;
		if( status !== this.status ){

			// Status has changed
			const query = await this.query("UPDATE "+this.constructor.table+" SET status=? WHERE id=? AND status!=?", [status, this.id, status], transaction);
			if( query.changedRows && status === SwishTransaction.STATUS_PAID ){ // Needed to prevent double spends
				return Math.trunc(data.amount);
			}

		}

		return 0;

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

        const q = await this.query("INSERT INTO "+this.table+" (user, uuid, status) VALUES (?,?,?)", [user, uuid, out.status]);
		out.id = q.insertId;

		return out;

	}

	static async getPendingByUser( user ){

		if( user instanceof User )
			user = user.id;

		user = Math.trunc(user);
		if( !user )
			throw new Error("Invalid user.");

		const rows = await this.query("SELECT * FROM "+this.table+" WHERE user=? AND status=?", [
			user, this.STATUS_PENDING
		]);
		return rows.map(el => new this(el));

	}

	

}




