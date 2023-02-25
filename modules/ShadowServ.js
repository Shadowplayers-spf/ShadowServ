import express from 'express';

export default class ShadowServ{
	
	constructor( port = 80 ){

		console.log("IT BEGINS!");
		this.app = express();
		this.port = port;
		this.components = {};			// Components are subclasses that extend Component

	}
	
	begin(){
		this.app.use(express.static('public'));
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



