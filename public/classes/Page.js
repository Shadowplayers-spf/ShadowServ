import Rest from "./Rest.js";

export default class PageManager{

    constructor(){
        this.pages = {};
        this.page = null;
        this.errors = new Map();    // index -> UserError()
        this.errIndex = 0;
    }

    async begin(){

        let page = window.location.hash;
        if( page.charAt(0) === "#" )
            page = page.substring(1);
        if( page )
            await this.setPage(page);

        if( !this.page )
            this.setPage("login");

    }

    getPage( id ){
        return this.pages[id];
    }
    async setPage( id ){
        
        const page = this.getPage(id);
        if( !page )
            return false;

        
        await page.onLoad();
        if( !page.firstLoad ){
            page.firstLoad = true;
            page.autoBind();
        }

        if( this.page )
            await this.page.onUnload();

        document.querySelectorAll("#content > div.page").forEach(el => el.classList.toggle("hidden", true));
        this.page = page;
        page.getDom().classList.toggle("hidden", false);
        window.location.hash = id;
        console.log("onBuild", page);
        await this.page.onBuild();
        return true;

    }

    addPage(id, onLoad, onBuild, onUnload){

        const p = new Page(this, id, onLoad, onBuild, onUnload);
        this.pages[id] = p;
        return p;

    }

    addError( text, isNotice = false ){
        
        ++this.errIndex;
        const err = new UserError(this, this.errIndex, text, isNotice);
        this.errors.set(this.errIndex, err);
        err.create();

    }

    removeError( idx ){
        
        const err = this.errors.get(idx);
        if( !err )
            return;
        err.onRemove();
        this.errors.delete(idx);

    }

    addNotice( text ){
        this.addError(text, isNotice);
    }

    async restReq( task, data ){

        const req = new Rest(task, data);
        try{

            const att = await req.run();
            return att;

        }
        catch(err){
            this.addError(err.message);
            console.log(err);
        }
        return false;

    }

}

export class UserError{
    static errors = [];
    
    constructor( parent, idx, message, isNotice = false ){
        
        this.parent = parent;
        this.message = message;
        this.isNotice = isNotice;
        this.idx = idx;
        this.dom = document.createElement("div");
    }

    create(){

        const text = document.createElement("div");
        text.innerText = this.message;
        document.getElementById("errors").append(this.dom);
        this.dom.append(text);
        this.dom.onclick = this.remove.bind(this);
        this.dom.classList.add("error");
        if( this.isNotice )
            this.dom.classList.add("notice");
        
        const dur = 12000;
        this._timeout = setTimeout(this.remove.bind(this), dur);
        this._timeout = setTimeout(this.onFade.bind(this), dur-1000);

    }

    onFade(){
        this.dom.classList.toggle("fade", true);
    }

    remove(){
        this.parent.removeError(this.idx);
    }

    onRemove(){

        clearTimeout(this._timeout);
        this.dom.remove();

    }
    
}

export class Page{
    constructor(parent, id, onLoad, onBuild, onUnload){
        
        this.parent = parent;
        this.firstLoad = false;     // Available in onLoad, lets you bind static stuff
        this.id = id;

        if( onLoad )
            this.onLoad = onLoad;
        if( onBuild )
            this.onBuild = onBuild;
        if( onUnload )
            this.onUnload = onUnload;

    }
    
    getDom(){
        return document.querySelector("#page-"+this.id);
    }

    async onLoad(){};
    async onBuild(){};
    async onUnload(){};

    onHref( evt ){
        
        const page = evt.currentTarget.dataset.href;
        this.parent.setPage(page);
        
    }

    autoBind(){
        
        this.getDom().querySelectorAll("a[data-href]").forEach(el => {
            el.onclick = this.onHref.bind(this);
        });

    }

}

