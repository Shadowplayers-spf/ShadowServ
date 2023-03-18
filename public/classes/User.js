import DbAsset from "./DbAsset.js";

export default class User extends DbAsset{

    constructor( data ){
        super(data);

        this.id = 0;
        this.nick = "";
        this.member = 0;
        this.privilege = 0;
        this.created = "";
        this.updated = "";
        this.session_token = "";

        this.load(data);
    }

    exists(){
        return this.id > 0;
    }

    rebase(){

    }
    

}


