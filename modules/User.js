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
        this.discord = "";
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
            discord : this.discord,
        };
    }

    async logIn( nick, pass ){
        
        nick = String(nick).trim();
        pass = String(pass);
        if( !nick || !pass )
            return;

        // Get by nick
        let template = await User.get({nick : nick}, 1);
        if( !template.id )
            return false;
        
        const validatePass = await Bcrypt.compare(pass, template.password);
        if( validatePass ){
            
            this.load(template);
            return true;

        }

        return false;

    }

    async loadByToken( token ){

        if( !token )
            return false;

        const template = await User.get({session_token : token});
        if( !template.id )
            return false;
        this.load(template);

    }

    isLoggedIn(){
        return ( this.privilege && this.id );
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
        const ex = await User.get({nick : nick});
        if( ex.id )
            throw new Error("User already exists");

        await User.query("INSERT INTO "+User.table+" (nick, privilege, member, password, discord) VALUES (?,?,?,?,?)", [this.nick, 1, 0, this.password, this.discord]);
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

