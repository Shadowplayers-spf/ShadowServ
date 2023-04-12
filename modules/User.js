import DB from "./DB.js";
import Crypto from "crypto";
import Bcrypt from "bcrypt";

export default class User extends DB{

    static table = "users";

    constructor(data){
        super(data);

        this.nick = "";
        this.privilege = 0;
        this.member = 0;
        this.password = "";
        this.discord = "";
        this.session_token = "";
        this.session_token_generated = 0;
        this.shop_credit = 0;       // Hela ören

        this.load(data);
    }

    getOut( full ){
        const out = {
            id : this.id,
            nick : this.nick,
            privilege : this.privilege,
            created : this.created,
            updated : this.updated,
        };
        if( full ){
            out.discord = this.discord;
            out.member = this.member;
            out.session_token = this.session_token;
            out.shop_credit = this.shop_credit;
        }
        return out;

    }

    async logIn( nick, pass ){
        
        nick = String(nick).trim();
        pass = String(pass);
        if( !nick || !pass )
            return;

        // Get by nick
        let template = await User.get({nick : nick}, 1);
        if( !template?.id )
            return false;
        
        const validatePass = await Bcrypt.compare(pass, template.password);
        if( validatePass ){
            
            this.load(template);
            await this.generateToken(true);
            return true;

        }

        return false;

    }

    // Transaction is a MYSQL transaction, which isn't required but should be used for security reasons
    async addShopCredit( credit = 0, transaction = undefined ){

        credit = Math.trunc(credit);
        if( !credit )
            throw new Error("Invalid amount of shop credit to add");
            
        await this.query("UPDATE "+this.constructor.table+" SET shop_credit = shop_credit+? WHERE id=?", [credit, this.id], transaction);
        this.shop_credit += credit; 

    }

    // Same as above, but for subtracting without allowing it to go negative
    async subShopCredit( credit, transaction ){

        credit = Math.trunc(credit);
        if( !credit )
            throw new Error("Invalid amount of SEK to subtract");
        
        const q = await this.query(
            "UPDATE "+this.constructor.table+" SET shop_credit = shop_credit-? WHERE shop_credit >= ? AND id=?", 
            [credit, credit, this.id],
            transaction
        );

        if( !q.changedRows )
            throw new Error("Insufficient funds in shop credit subtract.");
        
        this.shop_credit -= credit;

    }

    async loadByToken( token ){

        if( !token )
            return false;

        // Session is valid 4 weeks 
        const fetch = await User.query("SELECT * FROM "+User.table+" WHERE session_token=? AND session_token_generated+100800 > UNIX_TIMESTAMP()", [token]);
        if( !fetch.length )
            return false;
        this.load(fetch[0]);

    }

    isLoggedIn(){
        return ( this.privilege && this.id );
    }

    isAdmin(){
        return this.privilege >= 10;
    }

    async register( nick, pass, discord ){
        
        nick = String(nick).trim();
        if( !nick.match(/^[0-9a-z]+$/i) || nick.length < 3 || nick.length > 20 )
            throw new Error("Invalid nick "+nick);

        if( pass.length < 6 )
            throw new Error("Pass too short");

        this.discord = String(discord).substring(0,64);
        this.nick = nick;
        this.password = await Bcrypt.hash(pass, 10);
        const ex = await User.get({nick}, 1);
        if( ex?.id )
            throw new Error("User already exists");

        const q = await User.query("INSERT INTO "+User.table+" (nick, privilege, member, password, discord) VALUES (?,?,?,?,?)", [this.nick, 1, 0, this.password, this.discord]);
        this.id = q.insertId;
        if( !this.id )
            return false;

        await this.generateToken(true);

        return true;

    }

    async generateToken( save = false ){

        const bytes = await Crypto.randomBytes(48);
        this.session_token = bytes.toString('hex');
        if( save )
            await User.query("UPDATE "+User.table+" SET session_token = ?, session_token_generated=UNIX_TIMESTAMP() WHERE id=?", [this.session_token, this.id]);
        return true;

    }

    async destroyToken( save = false ){
        await User.query("UPDATE "+User.table+" SET session_token=NULL WHERE id=?", [this.id]);
    }

    // extends token
    refreshToken(){

        // Refresh token expiry max 1 per minute
        if( !this.session_token || Date.now()/1000-this.session_token_generated < 60 || !this.id )
            return;

        return User.query("UPDATE "+User.table+" SET session_token_generated=UNIX_TIMESTAMP() WHERE id=?", [this.id]);

    }


}

