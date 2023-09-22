import DB from "./DB.js";
import User from "./User.js";

export default class AdminLog extends DB{

	static table = 'admin_log';

    // Each contains a JSON object of changes
	static TYPES = {
        inventoryEdit : "inventoryEdit",
        loanEdit : "loanEdit",
        shopItemEdit : "shopItemEdit",
        userEdit : "userEdit",
        userDelete : "userDelete",
    };

    constructor(){

        super(...arguments);

		this.user = 0;
		this.type = AdminLog.TYPES.userEdit;
        this.pre = '';
        this.post = '';
        
		this.load(...arguments);

    }

    // This is naive. Probably need an approach to use _ for non DB parameters
	static async create( user, type, preAsset, postAsset ){

        if( user instanceof User )
            user = user.id;
        user = parseInt(user);
        if( !user )
            throw new Error("Invalid user for admin log");

        const obj = new this();
        obj.type = type;
        obj.user = user;

        if( !this.TYPES[type] )
            throw new Error("Invalid admin log type: "+obj.type);
        
        const preData = {}, postData = {};
        for( let i in preAsset ){

            // Use _ for things that aren't linked to a DBs
            if( i.charAt(0) === "_" )
                continue;

            const pr = preAsset[i], po = postAsset[i];
            if( pr === po && i !== "id" ) // ID always saved and required
                continue;

            if( pr !== undefined )
                preData[i] = pr;
            if( po !== undefined )
                postData[i] = po;

        }
        // no change
        if( !Object.keys(preData).length )
            return false;
        
        obj.pre = JSON.stringify(preData);
        obj.post = JSON.stringify(postData);

        const q = await this.query("INSERT INTO "+this.table+" (user, type, pre, post) VALUES (?,?,?,?)", [obj.user, obj.type, obj.pre, obj.post]);
		obj.id = q.insertId;

        return obj;

	}



}




