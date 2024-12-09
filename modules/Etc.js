import DB from "./DB.js";


export default class Etc extends DB{

    static table = "etc";


    constructor(){
        super(...arguments);

        this.label = "";
        this.data = "";

        this.load(...arguments);

    }

    // Returns data to the front end
    async getOut( admin = false ){

        const out = {
            id : this.id,
			label : this.label,
			data : this.data
        };
        return out;

    }

    // note: Can only update, not insert. Use a proper DB tool for that.
    static async set( label, val ){
        
        if( typeof val === "object" )
            val = JSON.stringify(val);
        val = String(val);

        return Etc.query("UPDATE "+Etc.table+" SET data=? WHERE label=?", [val, label]);

    }


}

