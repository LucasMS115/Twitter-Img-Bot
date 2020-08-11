const twt = require('./twitter.js');

const cld = require('cld'); //Language detection package

const google = require('./google.js'); 

let switcher = 2;

let breakpoint = '';

async function getLanguage(txt) {
    const result = await cld.detect(txt);
    return result.languages[0].code;
}

async function getGoogleImg(txt){

    let language;
    let gl;
    let index = 0;

    try {
        language = await getLanguage(txt);
    } catch (error) {
        console.log('On cld\n' + error);
    }

    if(language === 'pt') gl = 'br';
    else gl = 'us';

    console.log(`Initializing ${gl} img search for: ${txt}`)

    let url = ' ';

    await google.googleSearch(txt, 10, 'image', ['jpg', 'png'], gl)
    .then(response => {
        while(url.indexOf('https') === -1){
            url = response.data.items[index].link
            index++;
            console.log('Index++');
        };
    })
    .catch(err => console.log(err));

    return url;  

}

function removeFromStr(str, arr){

    arr.forEach(element => {
        str = str.replace(element, '')
    });
    
    return str;

}  

async function botReaction(data){ 

     console.log('Initializing function');

     let hashtags;
     let mentions; 
     let txt; //text of tweet
     let tid; //tweet id
     let url; //img url
     if(data.in_reply_to_status_id_str) tid = data.in_reply_to_status_id_str;
     else tid = data.id_str;

     try {
         await twt.searchById(tid)
         .then(data => {

             txt = data[0].text;
             hashtags = data[0].entities.hashtags;
             mentions = data[0].entities.user_mentions;

             if(hashtags) txt = removeFromStr(txt, hashtags.map((el) => {return '#' + el.text}));
             if(mentions) txt = removeFromStr(txt, mentions.map((el) => {return '@'+ el.screen_name}));
             
         })
     } catch (error) {
         console.log('Try SPID\n' + error);
     }
     

    console.log(txt);

    try {
         url = await getGoogleImg(txt);
    } catch (error) {
         console.log('Try GFImg\n' + error);
    }
    

    if(data.id_str === breakpoint) {
        console.log('BREAK');
        return;
    };

    console.log(url);

    try {

     twt.postTweet('Here: ', url, 'reply', data)
     .then(tweet =>{

         try{
             twt.follow(tweet.user.id_str);
         }catch(err){
             console.log('Try follow\n' + err);
         };

         let id;
         if(tweet.in_reply_to_status_id){
            id = tweet.in_reply_to_status_id_str;
         } 
         else id = tweet.id_str;

         twt.retweet(id)
         .then(data => {
             breakpoint = data.id_str;
         })
         .catch(err => {
             console.log(err);
         });

         try{
             twt.favourite(id);
         }catch(err){
             console.log('Try favourite\n' + err);
         };
     })
     .catch((err) => {
         console.log(err);
     });
        
    } catch (error) {
         console.log('Try Post\n' + error);
    }

    console.log('Ending function');

};

async function followPeople(){

    setTimeout(function(){
        try {
            twt.followRandom('en');
        } catch (error) {
            console.log(error);
        }
    }, 1000*60*5);

    setTimeout(function(){
          
        try {
            twt.followRandom('pt');
        } catch (error) {
            console.log(error);
        }
        if(switcher === 1) followPeople();
        else if(switcher > 1 && switcher < 3) unfollowPeople();
        else switcher = 1; unfollowPeople();
        
    }, 1000*60*10);
}

async function unfollowPeople(){
    setTimeout(function(){ 
        try {
            twt.prune();
        } catch (error) {
            console.log(error);
        }
        if(switcher === 1) followPeople();
        else if(switcher > 1 && switcher <= 3) unfollowPeople();

    }, 1000*60*15);
}

async function changeSwitcher(){
    setTimeout(function(){ 

        console.log('Switcher ' + switcher);

        if(switcher === 1) switcher++;
        else if (switcher === 3) switcher = 1;

        console.log('Switcher ' + switcher);

        changeSwitcher();

    }, 1000*60*60*24);
}



followPeople();
changeSwitcher();
twt.track('@RandyGoogleImg', botReaction);

  



