export default class Rest{

    constructor( task, args ){

        this.task = task;
        this.args = args;
        this.success = false;
        this.usr = 0;           // Each request also responds with the user id. Useful for check if you've been logged out.
        this.response = {};

    }

    async run(){

        const rData = {
            method : "POST"
        };


        if( this.args instanceof FormData ){
            rData.body = this.args;
            rData.body.append('task', this.task);
            rData.body.append('token', localStorage.token);
        }
        else{
            rData.headers = {
                "Accept" : "application/json",
                "Content-Type" : "application/json",
            };
            rData.body = JSON.stringify({
                task : this.task,
                args : this.args,
                token : localStorage.token
            });
        }

        const response = await fetch("/api", rData);
        const data = await response.json();
        
        this.usr = data.usr;
        this.success = data.success;
        this.response = data.response;
        if( !this.success )
            throw new Error(this.response);

        return this.response;

    }



}

