const g = require('googleapis').google;
const customSearch = g.customsearch('v1');
const gsCredentials = require('./configGoogle.json');


module.exports = {

    googleSearch(txt, n, type, fType, gl){
        
        return dataPromise = new Promise((resolve, reject)=>{
            
            let data = customSearch.cse.list({
                auth: gsCredentials.api_key,
                cx: gsCredentials.search_engine_id,
                q: txt,
                fileType: fType,
                gl:[gl],
                searchType: type,
                num: n
            });

            resolve(data);
            
        });
    
    }

}
