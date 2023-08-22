const axios = require('axios');

exports.getPosts = async (baseUrl, type, numPosts, postHandler) => {
    const numPages = Math.floor(numPosts/100)+1;

    for (let page = 1; page <= numPages; ++page) {
        let request = {
            url: `${baseUrl}/wp-json/wp/v2/${type}/?per_page=100&page=${page}`,
            method: 'get',
            timeout: 40000
        }
        
        console.log(request.url);

        let response;
        try {
            response = await axios(request);
            
            for (let i = 0; i < response.data.length; ++i) {
                --numPosts;
                if (numPosts < 0) break;

                //console.log(`${type} #${i} of Page ${page}`);
                await postHandler(response.data[i]);
            }     
       }    
       catch(err) {
            console.error(`[crawler] ERROR ${err.code}: Cannot fetch ${request.url}`, err);
            return;
       }
       if (response.data.length < 100) return;
    }
}

exports.getPost = async (baseUrl, type, postId, postHandler) => {
    let request = {
        url: `${baseUrl}/wp-json/wp/v2/${type}/${postId}`,
        method: 'get',
        timeout: 20000
    }
    
    console.log(request.url);

    let response;
    try {
        response = await axios(request);
        await postHandler(response.data);
            
    }    
    catch(err) {
        console.error(`[crawler] ERROR ${err.code}: Cannot fetch ${request.url}`, err);
        return;
    }
    if (response.data.length < 100) return;

}

exports.postTypes = () => ['posts', 'study', 'tracker'];
