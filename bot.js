const twt = require('./twitter.js');

const cld = require('cld'); //Language detection package

const google = require('./google.js'); 

let switcher = 2;

let breakpoint = '';

console.log('###  INITIALIZING BOT  ###');

//Identify the language of a string
async function getLanguage(txt) {
    const result = await cld.detect(txt);
    return result.languages[0].code;
}

async function getGoogleImg(txt){

    let language;
    let gl; //google language code
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
        //Change the link if it isn't a https
        while(url.indexOf('https') === -1){
            console.log('Not a https # ' + response.data.items[index].link + ' #');
            index++;
            url = response.data.items[index].link;
        };
    })
    .catch(err => console.log(err));

    return url;  

}

//Remove words from a string
function removeFromStr(str, arr){

    //arr will be an array of words
    arr.forEach(element => {
        str = str.replace(element, '')
    });
    
    return str;

}  

async function botReaction(data){ 

     console.log('###  Initializing function  ###');

     let hashtags;
     let mentions; 
     let txt; //text of tweet
     let tid; //tweet id
     let url; //img url

     if(data.in_reply_to_status_id_str) tid = data.in_reply_to_status_id_str;
     else tid = data.id_str;

     if(data.in_reply_to_screen_name === 'RandyGoogleImg'){
        console.log('Can\'t reply to myself');
        return;
     }

     //Preparing the text for the search
     try {
         await twt.searchById(tid)
         .then(data => {

             txt = data[0].text;
             hashtags = data[0].entities.hashtags;
             mentions = data[0].entities.user_mentions;

             if(hashtags) txt = removeFromStr(txt, hashtags.map((el) => {return '#' + el.text}));
             if(mentions) txt = removeFromStr(txt, mentions.map((el) => {return '@'+ el.screen_name}));
             if(txt.indexOf('http') !== -1) txt = txt.substring(txt.indexOf('http'), 0);
             txt = txt.substring(0, 99);
             
         })
     } catch (error) {
         console.log('Try SPID\n' + error);
     }
     

    console.log('Tweet text to search # ' + txt + ' #');

    //Searching the img  
    try {
         url = await getGoogleImg(txt);
    } catch (error) {
         console.log('Try GFImg\n' + error);
    }
    

    //Trying to prevent a loop coused by retweets
    if(data.id_str === breakpoint) {
        console.log('BREAK');
        return;
    };

    console.log('URL -> '+ url);

    try {
        
        twt.postTweet('Here: ', url, 'reply', data)
        .then(tweet =>{

            try{
                twt.follow(tweet.user.id_str); //Follow who mentioned
                twt.follow(tweet.in_reply_to_user_id_str); //Follow who was replied
            }catch(err){
                console.log('Try follow\n' + err);
            };
   
            //The intention is to favourite and retweet the tweet we are replying
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
   
            //The set timeout is an attempt to prevent twitter's spamming block
            setTimeout(function(){
               try{
                   twt.favourite(id);
               }catch(err){
                   console.log('Try favourite\n' + err);
               };
            }, 1000);
         
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
            twt.followRandom('en'); //Follow an english speaker
        } catch (error) {
            console.log(error);
        }
    }, 1000*60*20);

    setTimeout(function(){
          
        try {
            twt.followRandom('pt'); //Follow an portuguese speaker
        } catch (error) {
            console.log(error);
        }
        if(switcher === 1) followPeople();
        else if(switcher > 1 && switcher < 3) unfollowPeople();
        else unfollowPeople();
        
    }, 1000*60*40);
}

//Unfollow who donn't follows back
async function unfollowPeople(){
    setTimeout(function(){ 
        try {
            twt.prune();
        } catch (error) {
            console.log(error);
        }
        if(switcher === 1) followPeople();
        else if(switcher > 1 && switcher <= 3) unfollowPeople();
        else if(switcher > 1 && switcher <= 3 && twt.efiaf){
            switcher = 1;
            twt.efiaf = false;
            followPeople();
        };

    }, 1000*60*40);
}

//The intention here is to follow 144 people in 12 hours and then try to unfollow 144 people in 24 hours, trying to prevent spamming
async function changeSwitcher(){
    setTimeout(function(){ 

        console.log('Switcher ' + switcher);

        if(switcher < 3 ) switcher++;
        else if (switcher === 3) switcher = 1;

        console.log('Switcher ' + switcher);

        changeSwitcher();

    }, 1000*60*60*6);
}



followPeople();
changeSwitcher();
twt.track('@RandyGoogleImg', botReaction);



  



