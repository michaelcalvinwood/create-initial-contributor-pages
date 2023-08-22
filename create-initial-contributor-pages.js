require('dotenv').config();

const fs = require('fs');
const wp = require('./utils/wp-api');
const ai = require('./utils/ai');

const promptMe = require('prompt-sync')();
const { convert } = require('html-to-text');
const { exec } = require("child_process");
const latinize = require('latinize');
const mysql = require('mysql2');

const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE} = process.env;

const mysqlOptions = {
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  }
  
  const pool = mysql.createPool(mysqlOptions);
  
  const query = q => {
    return new Promise((resolve, reject) => {
      pool.query(q, function(err, rows, fields) {
        
        if (err) {
            console.error('ERROR', q);
            return resolve(false);
        }
        resolve(rows)
      });
    })
  }

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

const findContributors = async () => {
    await wp.getPosts('https://delta.pymnts.com', 'posts', 20000, handlePost);

    fs.writeFileSync('./contributors.json', JSON.stringify(Array.from(Contributors)));

    console.log('SIZE', Array.from(Contributors).length);
}

const openChrome = name => {
    name = latinize(name);
    let command = `open -a "Google Chrome.app" https://delta.pymnts.com/contributor/${name.replaceAll(' ', '_')}\?key=46f9eac22479d8aeee8f3dcc4b044a7bf0325e73e5a3179748d94c5d961d95df`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    //console.log(command);
}

const contributorExists = async name => {
    name = latinize(name);
    const q = `SELECT name, photo, affiliation, role, occupation, bio, contribution, posts, first_post FROM contributors WHERE name='${name}'`;

    const r = await query(q);

    return r.length ? true : false;
}

const createContributorPages = async () => {
    let contributors = fs.readFileSync('contributors.json');
    contributors = JSON.parse(contributors);

    let max = 5;
    let count = 0;

    for (i = 0; i < contributors.length; ++i) {
        let test = await contributorExists(contributors[i]);
        
        if (test) {
            console.log('SKIP', contributors[i]);
            continue;
        }
        console.log('CREATE', contributors[i]);
        
        openChrome(contributors[i])
        ++count;
        if (!(count % max)) {
            let result = promptMe('Load more?');
            if (result === 'quit') return; 
            count = 0;
        }
    }
}

createContributorPages();