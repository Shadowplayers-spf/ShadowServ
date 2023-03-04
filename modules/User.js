import DB from "./DB.js";
import Crypto from "crypto";
import Bcrypt from "bcrypt";

export default class User extends DB{

    static table = "users";

    constructor(data){
        super(data);

        this.nick = "";
        this.privilege = 1;
        this.member = 1;
        this.created = "";
        this.updated = "";
        this.password = "";
        this.session_token = "";

        this.load(data);
    }

    getOut(){
        return {
            nick : this.nick,
            privilege : this.privilege,
            member : this.member,
            created : this.created,
            updated : this.updated,
        };
    }

    async logIn( nick, pass ){
        
        nick = nick.trim();
        if( !nick || !pass )
            return;

        // Get by nick
        let template = await User.get({nick : nick}, 1);
        
        const validatePass = await Bcrypt.compare(pass, template.password);
        if( validatePass ){
            
            this.load(template);
            return true;

        }

        return false;

    }

    isLoggedIn(){
        return ( this.privilege && this.id );
    }

    async register( nick, pass ){
        
        nick = nick.trim();
        if( !input_string.match(/^[0-9a-z]+$/i) || nick.length < 3 || nick.length > 20 )
            throw new Error("Invalid nick");

        if( pass.length < 6 )
            throw new Error("Pass too short");

        this.nick = nick;
        this.password = await Bcrypt.hash(pass, 10);
        const ex = await User.get({nick : nick});
        if( ex.id )
            throw new Error("User already exists");

        await User.query("INSERT INTO "+User.table+" (nick, privilege, member, password) VALUES (?,?,?,?)", [this.nick, 1, 0, this.password]);
        await this.generateToken();
        return true;

    }

    async generateToken( save = false ){

        const bytes = await Crypto.randomBytes(48);
        this.session_token = bytes.toString('hex');
        if( save )
            await User.query("UPDATE "+User.table+" SET session_token = ? WHERE id=?", [this.session_token, this.id]);
        return true;

    }

}

