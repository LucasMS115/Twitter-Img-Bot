const Twit = require('twit');

const config = require('./configTT');

const fs = require('fs');

const T = new Twit(config);

const https = require('https');

function postImg(url, tweet) {
    
    return new Promise((resolve, reject) => {

        function returnData(err, data, response) {
            if(err) console.log(`PostImg ->  ${err}`);
            else resolve(data);
        };

        function uploaded(err, data, response) {
            const media_id = data.media_id_string;
            tweet.media_ids = [media_id];
            T.post('statuses/update' , tweet, returnData);
        };
        
        https.get(url, response => {
            if (response.statusCode !== 200)
                throw new Error('Link invalido')

            response.setEncoding('base64')
            body = ''
            response.on('data', data => {
                body += data
            })

            response.on('end', () => {
                T.post('media/upload', {media_data: body}, uploaded);
            })

        })
    });
}

//recieve a path to an image and return the data
async function getImg(path){
    
    const params = {
        encoding: 'base64'
    }

    return fs.readFileSync(path, params);
}


module.exports = {

    efiaf: false, //Every friend is a follower

    track(at, callback){
        const stream = T.stream('statuses/filter', { track: at });
        stream.on('tweet', callback);
    },

    //return the data from a search. 'params' is an object especified by the twitter api
    searchTweets(params){
        
        return dataPromise = new Promise((resolve, reject)=>{
            
            function returnData(err, data, response) {
                if(err) console.log(`SearchTweets ->  ${err}`);
                resolve(data);
            };
            
            T.get('search/tweets', params, returnData);
            
        });

    },

    searchById(id){
        
        return dataPromise = new Promise((resolve, reject)=>{
            
            function returnData(err, data, response) {
                if(err) console.log(`SearchTweets ->  ${err}`);
                resolve(data);
            };
            
            T.get('statuses/lookup', {Name: 'ex', id: id}, returnData);
            
        });

    },

    //post a tweet and return the data of it
    async postTweet(statusTxt = 'There it is!!', imgUrl = null,  select = 'post' , inResponseTo = undefined){

        //inResponseTo will be the full data of a tweet

        let dataI;
        let replyTo = '';
        let user = '';
        let tweet; //tweet is an object specifed by the twitter api

        //update the 'tweet' variable to be a reply or a post based on the select parameter 
        if(select === 'reply' && inResponseTo !== undefined){

            //if the 'inResponseTo' is already a reply, the reply will be to the tweet it replied
            if(inResponseTo.in_reply_to_status_id_str){
                replyTo = inResponseTo.in_reply_to_status_id_str;
                user = inResponseTo.in_reply_to_screen_name;
            }     
            else{
                replyTo = inResponseTo.id_str;
                user = inResponseTo.user.screen_name;
            } 

            tweet = {
                status: `@${user} ${statusTxt}`,
                in_reply_to_status_id: replyTo,
                username: user,
            };

        }else{
            tweet = {
                status: statusTxt
            };
        };
        
        //if there is a media, it needs to be uploaded before it can be posted
        if(imgUrl) dataI = await postImg(imgUrl, tweet);

        return new Promise((resolve, reject)=>{

            function returnData(err, data, response) {
                if(err) console.log(`PostTweet ->  ${err}`);
                if(select === 'reply') resolve(inResponseTo);
                else resolve(data);
            };
        
            if(!imgUrl){
                T.post('statuses/update' , tweet, returnData);
                console.log('No image');
            } 
            else {
                console.log('With image');
                if(select === 'reply') resolve(inResponseTo);
                else resolve(dataI);
            }

            console.log('Posted :)');
        
        });

    },

    //receive a tweet id string and favourite that tweet
    favourite(tweet){
        
        return dataPromise = new Promise((resolve, reject)=>{
            
            function returnData(err, data, response) {
                if(err) console.log(`Favourite ->  ${err}`);
                resolve(data);
            };
            
            if(typeof tweet != 'undefined')
                T.post('favorites/create', { id: tweet }, returnData);
        });

    },

    //receive a tweet id string and retweet that tweet
    retweet(tweet){
        
        return dataPromise = new Promise((resolve, reject)=>{
            
            function returnData(err, data, response) {
                if(err) console.log(`Retweet ->  ${err}`);
                resolve(data);
            };
            
            if(typeof tweet != 'undefined')
                T.post('statuses/retweet/:id', { id: tweet }, returnData);
        });

    },

    //receive a user id string and follow that user
    follow(userId){
        
        return dataPromise = new Promise((resolve, reject)=>{
            
            function returnData(err, data, response) {
                if(err) console.log(`Follow ->  ${err}`);
                else{
                    resolve(data);
                }
            };
            
            T.post('friendships/create', { id: userId }, returnData); 

        });

    },

    //Unfollow someone who doesn't follow the bot 
    prune(){

        let friends; //array with people the bot is following
        let followers; //array with people following the bot

        function callback(err, data, response) {

            if(err) console.log(`Prune ->  ${err}`);
            friends = data.users.map(el => {return el.screen_name});
            
            T.get('followers/list', (err, data, response) => { 

                followers = data.users.map(el => {return el.screen_name});
                if(friends.length + 1 <= followers.length) efiaf = true;
                
                try {
                    //Unfollow the one user who is in the friends array but aren't in the followers array
                    for(var i = friends.length - 1; i >= 0; i--){
                        if(followers.indexOf(friends[i]) === -1){
                            T.post('friendships/destroy', { screen_name: friends[i] }, (err, data, response) => {if(err)console.log(`F.D. -> ${err}`)});
                            console.log(friends[i] + ' Pruned');
                            break;
                        };
                    }

                } catch (error) {
                    console.log(error)
                }

            });
            
        };

        T.get('friends/list', callback);

    },
    
    //Search a random tweet and follow that user
    followRandom(language){

        let index = Math.floor(Math.random() * 19) ;
        let id;
        let txt;

        if(language === 'pt') txt = 'Eu'; //Search for tweets in portuguese or english
        else txt = ' I am ';

        this.searchTweets({q: txt , count: 20, result_type: 'recent', lang: language}).then(data => {
            id = data.statuses[index].user.id_str;
            console.log('Following ' + data.statuses[index].user.screen_name);
            this.follow(id);
        });

    }

    
};






