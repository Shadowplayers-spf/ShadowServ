import DB from "./DB.js";
import User from "./User.js";

/*
	This is used for games/books we have available on site.
	See ShopItem for the store.
*/
export default class Inventory extends DB{

	static table = "inventory_loan_log";

    static types = {
        loaned : 'loaned',
        returned : 'returned',
    };

	constructor(){
		super(...arguments);

		this.user = 0;
		this.asset = 0;
		this.type = 'loaned';
        
		this.load(...arguments);
	}

    static async create( user, asset, type ){

        if( !this.types[type] )
            throw new Error("Felaktig logtyp");

        if( user instanceof User )
            user = user.id;
        user = Math.trunc(user);
        if( !user )
            throw new Error("Felaktig användare för log");

        if( asset instanceof Inventory )
            asset = asset.id;
        asset = Math.trunc(asset.id);
        if( !asset )
            throw new Error("Felaktig asset för log");

        await this.query("INSERT INTO "+this.table+" (user, asset, type) VALUES (?,?,?)", [user, asset, type]);

    }



}


