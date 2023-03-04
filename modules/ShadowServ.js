import express from 'express';
import User from './User.js';

export default class ShadowServ{
	
	constructor( port = 80 ){

		console.log("IT BEGINS!");
		this.app = express();
		this.port = port;
		this.components = {};			// Components are subclasses that extend Component

	}
	
	begin(){
		
        this.app.use(express.static('public'));
        this.app.use(express.json());
        this.app.post("/api", async (req, res) => {
            
            const rest = new Rest(this, req);
            let out = {
                success : true,
                response : {}
            };
            try{
                out.response = await rest.exec();
            }catch(err){
                out.success = false;
                out.response = err.message;
            }

            res.json(out);

        });
		this.app.listen(this.port, () => {
			console.log(`ShadowServ online on port ${this.port}`)
		});
		
	}

	addComponent( name, component, looping = 0 ){
        
        if( this.components[name] )
            this.removeComponent(name);

        this.components[name] = component;
        component._begin(this, looping);
        
    }

    getComponentName( component ){
        for( let i in this.components ){
            if( component === this.components[i] )
                return i;
        }
    }

    getComponent( name ){
        return this.components[name];
    }

    removeComponent( name ){

        const component = this.getComponent(name);
        if( !component )
            return;
        clearInterval(component._interval);
        delete this.components[name];

    }

}


class Rest{

    constructor( server, body = {} ){

        this.server = server;
        this.body = body;
        this.user = new User();

    }

    async getUser(){

        if( !this.body.token )
            await this.user.loadByToken(this.body.token);

    }

    async exec(){

        await this.getUser();
        const 
            task = this.body.task,
            args = this.body.args
        ;
        if( !Array.isArray(args) )
            args = [args];
    
        let fn = "pub"+task;
        if( typeof this[fn] === "function" )
            return await this[fn].call(this, ...args);
        
        fn = "pvt"+task;
        if( typeof this[fn] === "function" ){

            if( !this.user.isLoggedIn() )
                throw new Error("Access denied");

            return await this[fn].call(this, ...args);

        }

        throw new Error("Task invalid: "+task);

    }

    
    async pubRegister( nick, password0, password1 ){

        const user = new User();
        this.user = user;

        user.nick = nick;
        user.password = password0;
        if( password0 !== password1 )
            throw new Error("Passwords don't match");

        // The rest is handled by User
        await user.register();

        const out = this.user.getOut();
        out.session_token = this.user.session_token;
        return out;

    }

    // Fetches userdata and generates a new 
    async pubLogin( nick, password ){

        await this.user.login(nick, password);
        const out = this.user.getOut();
        out.session_token = this.user.session_token;
        return out;
        
    }


}


// Extend this in your component.
class Component{
    // Run by the server once the component is added
    _begin( server, looping = 0 ){

        this._server = server;
        this._looping = looping;
        this._interval = null;

        if( this._looping > 0 )
            this._interval = setInterval(() => this.exec(), this._looping);
        this.begin();

    }
    
    // Removes this component from the server
    remove(){
        this._server.removeComponent(this._server.getComponentName(this));
    }
    
    
    // Override these
    exec(){}    // Runs each loop
    end(){}     // Runs when removed
    begin(){}   // Runs when component is added

}

export {Component};



