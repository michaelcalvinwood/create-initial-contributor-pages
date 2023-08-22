require('dotenv').config();

const fs = require('fs');
const wp = require('./utils/wp-api');
const ai = require('./utils/ai');

const { convert } = require('html-to-text');

const Contributors = new Set();
let ContributorSize = 0;

const getParagraph = (prompt, content, test, test2 = false) => {
    const beginning = content.lastIndexOf('<p>', test);
    const ending = content.indexOf('</p>', test);
    const paragraph = content.substring(beginning, ending + 4);
    return {
        prompt,
        paragraph
    }
}

const getPrompt = content => {
    let prompt = `"""In the Paragraph below, who spoke to PYMNTS? Provide the name only with no other words.

Paragraph:\n`;

    let test, test2;
    
    test = content.indexOf(`speaking with pymnts`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`speaking to pymnts`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`told pymnts`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`tells pymnts`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`in an interview with pymnts`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`pymnts`);
    if (test !== -1) {
        test2 = content.indexOf('in a conversation with', test+1);
        if (test2 !== -1) {
            prompt = getParagraph(prompt, content, test, test2)
            return prompt
        };
    }

    test = content.indexOf(`pymnts spoke`);
    if (test !== -1) {
        test2 = content.indexOf('with', test+1);
        if (test2 !== -1) {
            prompt = getParagraph(prompt, content, test, test2)
            return prompt
        };
    }

    prompt = `"""In the Paragraph below, who spoke to Karen Webster? Provide the name only with no other words.
    
Paragraph:\n`;

    test = content.indexOf(`told Karen Webster`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`during a conversation with Karen Webster`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };

    test = content.indexOf(`Karen Webster sat down with`);
    if (test !== -1) {
        prompt = getParagraph(prompt, content, test)
        return prompt
    };


    return false;
}

const handlePost = async post => {
    if (!post.content) return;
    if (!post.content.rendered) return;

    let content = post.content.rendered.toLowerCase();

    let prompt = getPrompt(content);

    if (prompt === false) return;

    // convert paragraph to text

    let paragraphText = convert(prompt.paragraph);
    paragraphText = paragraphText.replaceAll(`\n`, ' ').replaceAll(/\[.*?\]/g, '');
    
    // get the identity of the speaker

    const thePrompt = prompt.prompt + paragraphText + `"""\n`;
    //console.log(thePrompt);

    const identity = await ai.getChatText(thePrompt);

    
    const length = identity.split(' ').length;

    if (length < 2 || length > 3) return;

    Contributors.add(identity);

    if (Contributors.size > ContributorSize) {
        console.log('IDENTITY', identity);
        ContributorSize = Contributors.size;
    }

}

const test = async () => {
    await wp.getPosts('https://delta.pymnts.com', 'posts', 20000, handlePost);

    fs.writeFileSync('./contributors.json', JSON.stringify(Array.from(Contributors)));

    console.log('SIZE', Array.from(Contributors).length);
}

test();