import PageManager from "./classes/Page.js";

const pm = new PageManager();
export default pm;

pm.addPage(
    "login",
    // onLoad
    async function(){

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        dom.querySelector("form").onsubmit = async event => {
            event.preventDefault();

            const
                user = dom.querySelector("input[name=username]").value,
                pass = dom.querySelector("input[name=password]").value
            ;
            
            const req = await pm.restReq("Login", [user, pass]);
            if( req ){
                console.log("Todo: Handle user login response ", req);
            }

        };
        
    },
    // onUnload
    async function(){

    }
);


pm.addPage(
    "signup",
    // onLoad
    async function(){

    },
    // onBuild
    async function(){
        
        const dom = this.getDom();
        dom.querySelector("form").onsubmit = async event => {
            event.preventDefault();

            const
                user = dom.querySelector("input[name=username]").value,
                pass0 = dom.querySelector("input[name=password0]").value,
                pass1 = dom.querySelector("input[name=password1]").value,
                discord = dom.querySelector("input[name=discord]").value
            ;
            
            const req = await pm.restReq("Register", [user, pass0, pass1, discord]);
            if( req ){
                console.log("Todo: Handle registration response ", req);
            }

        };
    },
    // onUnload
    async function(){

    }
);


pm.addPage(
    "user",
    // onLoad
    async function(){

    },
    // onBuild
    async function(){

    },
    // onUnload
    async function(){

    }
);






