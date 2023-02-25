import {Component} from "./ShadowServ.js";


class Ebas extends Component{

    static Endpoint = "https://ebas.sverok.se/apis/";

    constructor( fNumber, apiKey ){
        super();
        
        this.fNumber = fNumber;
        this.apiKey = apiKey;
        
    }

    exec(){
        console.log("Tick...");
    }

    async hasMemberWithNick( nick ){
        return await this.req("confirm_membership.json", "confirm_membership", {
            member_nick : nick
        });
    }

    async req( endpoint, task, data ){

        const req = {
            request : {
                action : task,
                association_number : this.fNumber,
                api_key : this.apiKey,
            }
        }
        for( let i in data )
            req.request[i] = data[i];
        
        const res = await fetch(this.constructor.Endpoint+endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req)
        });

        return await res.json();

    }
        

}



export default Ebas;

