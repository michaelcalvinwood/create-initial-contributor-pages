require('dotenv').config();

const wp = require('./utils/wp-api');

const getPrompt = content => {
    let prompt = `"""In the Paragraph below, who spoke to PYMNTS? Provide the name only with no other words.

Paragraph:\n`;

    let test, test2;
    
    test = content.indexOf(`speaking with pymnts`);
    if (test !== -1) return prompt;

    test = content.indexOf(`speaking to pymnts`);
    if (test !== -1) return prompt;

    test = content.indexOf(`told pymnts`);
    if (test !== -1) return prompt;

    test = content.indexOf(`tells pymnts`);
    if (test !== -1) return prompt;

    test = content.indexOf(`in an interview with pymnts`);
    if (test !== -1) return prompt;

    test = content.indexOf(`pymnts`);
    if (test !== -1) {
        test2 = content.indexOf('in a conversation with', test+1);
        if (test2 !== -1) return prompt;
    }

    test = content.indexOf(`pymnts spoke`);
    if (test !== -1) {
        test2 = content.indexOf('with', test+1);
        if (test2 !== -1) return prompt;
    }

    prompt = `"""In the Paragraph below, who spoke to Karen Webster? Provide the name only with no other words.
    
Paragraph:\n`;

    test = content.indexOf(`told Karen Webster`);
    if (test !== -1) return prompt;

    test = content.indexOf(`during a conversation with Karen Webster`);
    if (test !== -1) return prompt;

    test = content.indexOf(`Karen Webster sat down with`);
    if (test !== -1) return prompt;


    return false;
}

const handlePost = async post => {
    if (!post.content) return;
    if (!post.content.rendered) return;

    let content = post.content.rendered.toLowerCase();

    let prompt = getPrompt(content);

    if (prompt === false) return;

    console.log('CONTENT', content);
}

const test = async () => {
    await wp.getPosts('https://delta.pymnts.com', 'posts', 10, handlePost);
}

test();