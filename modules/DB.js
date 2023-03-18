import Mysql from 'mysql';


// This class should be extended by asset types
export default class DB{

    constructor(params){
        this.id = 0;
        this.created = "";
        this.updated = "";
    }

    load( params ){
        if( typeof params !== "object" )
            params = {};

        for( let i in params ){
            
            if( this.hasOwnProperty(i) && typeof this[i] !== "function" ){
                
                const data = params[i];
                const type = typeof this[i];
                if( type === "object" )
                    this[i] = JSON.parse(data);
                else if( type === "number" || type === "boolean"  )
                    this[i] = +data;
                else
                    this[i] = data;

            }

        }
    }

    static async get( fields = {}, limit = false ){
        if( !isNaN(fields) )
            fields = {id : fields};

        if( !this.table )
            throw 'No table definition for '+this.name;
        let query = "SELECT * FROM "+this.table;
        
        const keys = [];
        const vals = [];
        for( let field in fields ){
            keys.push(field+"=?");
            vals.push(fields[field]);
        }

        if( keys.length ){
            query += " WHERE " + keys.join(",");
        }
        limit = Math.trunc(limit);
        if( limit > 0 )
            query += " LIMIT "+limit;
        const rows = await this.query(query, vals);
        const out = rows.map(row => new this(row));
        if( limit === 1 )
            return out[0];
        return out;
        
    }


    async query( query, params = [] ){

        return this.constructor.query(query, params);   

    }

    static async query( query, params = [] ){
        
        return await new Promise((res, rej) => {
            this.pool.query(query, params, (err, results) => {
                if( err )
                    return rej(err);
                res(results);
            })
        });

    }

    static async begin( user, pass, database, host = "127.0.0.1" ){

        this.pool = Mysql.createPool({
            host : host,
            user : user,
            password : pass,
            database : database,
        });
    }

}



