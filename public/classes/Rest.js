export default class Rest{

    constructor( task, args ){

        this.task = task;
        this.args = args;
        this.success = false;
        this.usr = 0;           // Each request also responds with the user id. Useful for check if you've been logged out.
        this.response = {};

    }

    async run(){

        const response = await fetch("/api", {
            method : "post",
            headers : {
                "Accept" : "application/json",
                "Content-Type" : "application/json"
            },
            body : JSON.stringify({
                task : this.task,
                args : this.args,
                token : localStorage.token
            })
        });

        const data = await response.json();
        
        this.usr = data.usr;
        this.success = data.success;
        this.response = data.response;
        if( !this.success )
            throw new Error(this.response);

        return this.response;

    }



}

