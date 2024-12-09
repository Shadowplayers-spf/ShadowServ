export default class Rest{

    constructor( task, args, additional = {} ){

        this.task = task;
        this.args = args;
        this.success = false;
        this.usr = 0;           // Each request also responds with the user id. Useful for check if you've been logged out.
        this.response = {};
        this.additional = typeof additional === "object" && additional ? additional : {};   // Additional args to send in body

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

            const body = {
                task : this.task,
                args : this.args,
                token : localStorage.token
            };

            for( let i in this.additional )
                body[i] = this.additional[i];

            rData.body = JSON.stringify(body);
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

