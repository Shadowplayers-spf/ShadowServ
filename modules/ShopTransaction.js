import DB from "./DB.js";
import User from "./User.js";
/*
	Transaction log

*/
export default class ShopTransaction extends DB{

    static table = "shop_transactions";

    constructor(){
        super(...arguments);

        this.item = 0;
        this.user = 0;
        this.amountPaid = 0;

        this.load(...arguments);
    }

    getOut( full = false ){

        const out = {
            id : this.id,
            created : this.created,
            item : this.item,
            amountPaid : this.amountPaid
        };
        if( full )
            out.user = this.user;
        return out;

    }

    // Transaction is a MYSQL transaction.
	static async create( item, user, amountPaid, transaction ){

        item = Math.trunc(item);
        user = Math.trunc(user);
        amountPaid = Math.trunc(amountPaid);
        if( item < 1 || user < 1 )
            throw new Error("Invalid item or user passed to transaction.");

        const out = new self({
            item, user
        });
        const q = await this.query("INSERT INTO "+this.table+" (item, user, amountPaid) VALUES (?,?,?)", [item, user, amountPaid], transaction);
        out.id = q.insertId;
        return out;

    }

    // Returns all transactions by a user in the past year
    static async getAllByUser( user ){

        if( user instanceof User )
            user = user.id;
        user = Math.trunc(user);
        if( !user )
            throw new Error("Invalid user");

        const q = await this.query("SELECT * FROM "+this.table+" WHERE user=? AND created > DATE_SUB(NOW(), INTERVAL 1 YEAR) ORDER BY created DESC");
        return q.map(el => new this(el));

    }

}

