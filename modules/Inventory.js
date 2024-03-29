import DB from "./DB.js";
import User from "./User.js";

/*
	This is used for games/books we have available on site.
	See ShopItem for the store.
*/
export default class Inventory extends DB{

	static table = "inventory";

    // Fields that are accepted as is using the admin REST entrypoint
    static ADMIN_SETTABLE = [
        'name', 'description', 'barcode', 'active', 'holder', 'owner', 'loanable', 'type', 'comment', 'language', 'min_age', 'complete', 'min_players', 'max_players', 'round_time'
    ];

	static COMPLETION = {
		unknown : 0,
		partial_heavy : 1,
		partial_light : 2,
		full : 3
	};

	static TYPES = {
		boardgame : 'boardgame',
		cardgame : 'cardgame',
		book : 'book',
		electronic_game : 'electronic_game',
		hardware : 'hardware',
		equipment : 'equipment',
		other : 'other',
	};

	constructor(){
		super(...arguments);

		this.name = '';
		this.description = '';
		this.barcode = '';
		this.holder = 0;			// User loaning this item. By default, this is the Shadowplayers clubhouse.
		this.owner = 0;				// Who owns this item? Defaults to clubhouse.
		this.loanable = 0;			// Whether you can loan this item home or not.
		this.active = 1;			// When 0, it's something that's no longer available.
		this.type = 'boardgame';	// Todo: Decide what types of items we should have.
		this.comment = '';			// Comment for admins only
		this.language = 'sv';
		this.min_age = 0;
		this.min_players = 0;
		this.max_players = 0;
		this.round_time = 0;		// Time in minutes
		this.complete = this.constructor.COMPLETION.unknown;

		this.load(...arguments);
	}

	// restUserId = user in a rest call. Needed because it should return the loaned by user if they're the same that's loaning this
	async getOut( admin = false, restUserId = 0 ){

		const out = {
			id : this.id,
			created : this.created,
			updated : this.updated,
			name : this.name,
			barcode : this.barcode,
			holder : +(this.holder > 1), // Non-admin gets to see if it's loaned out, but not by who
			owner : this.owner,
			loanable : this.loanable,
			type : this.type,
			language : this.language,
			min_age : this.min_age,
			complete : this.complete,
			description : this.description,
			min_players : this.min_players,
			max_players : this.max_players,
			round_time : this.round_time,
			_holder : {},
		};

		if( admin ){

			out.holder = this.holder;
			out.active = this.active;
			out.comment = this.comment;			

		}


		// If this was loaned by you, we include the holder
		if( this.holder && (admin || restUserId === this.holder) ){

			const usr = await User.get(this.holder, true);
			out._holder = await usr.getOut();
			out.holder = this.holder;

		}

		//console.log("USR out", out._holder, "this", this.id, "holder", this.holder, "restuserid", restUserId);


		return out;

	}

	async setHolder( user ){
		if( user instanceof User )
			user = user.id;
		user = Math.trunc(user);
		if( !user )
			throw new Error("Felaktig användare");

		this.holder = user;
		await this.query("UPDATE "+this.constructor.table+" SET holder=? WHERE id=?", [user, this.id]);
		return true;

	}

	async resetHolder(){

		this.holder = 0;
		await this.query("UPDATE "+this.constructor.table+" SET holder=0 WHERE id=?", [this.id]);
		return true;

	}

	// Makes sure we don't write bogus values to DB.
    sanitize(){

        this.name = String(this.name).trim();
        if( !this.name )
            this.name = "Unknown item";

        if( !this.constructor.TYPES[this.type] )
            this.type = this.constructor.TYPES.other;
		
		if( this.complete > this.constructor.COMPLETION.full )
			this.complete = this.constructor.COMPLETION.full;
		if( this.complete < 0 )
			this.complete = 0;
		

    }

	// Saves changes or inserts a new one if this.id = 0
	async saveOrInsert(){

		this.sanitize();

		if( !this.id ){
			const q = await this.query("INSERT INTO "+this.constructor.table+" (name) VALUES (?)", [this.name]);
			this.id = q.insertId;
		}

		await this.query("UPDATE "+this.constructor.table+" SET name=?, description=?, barcode=?, holder=?, owner=?, loanable=?, active=?, type=?, comment=?, language=?, min_age=?, complete=?, min_players=?, max_players=?, round_time=? WHERE id=?", [
			this.name, this.description, this.barcode, this.holder, this.owner, this.loanable, this.active, this.type, this.comment, this.language, this.min_age, this.complete, this.min_players, this.max_players,  this.round_time, this.id
		]);

	}

	/*
        Gets a list of all inventory items 
    */
	static async getAll( includeInactive = false ){

		const filters = {};
		if( !includeInactive )
			filters.active = 1;

		return await this.get(filters);

	}

	static async getLoanedByUser( user ){
		if( user instanceof User )
			user = user.id;

		return await this.get({holder:user, active:1});

	}


}
