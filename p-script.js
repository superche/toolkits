const fs = require('fs');
const http = require('http');

/**
 * Input Values
 */
const url = '';
const localFilepath = '' || './p.json';

const parseBase64 = (base64Str, targetFormat) => {
    return new Buffer(base64Str, 'base64').toString(targetFormat || 'utf8');
};

/**
 * 
 * @param {*} ssrArr 
 * [ 'ssr://<encoded data>', ... ]
 */
const parseSsrArray = (ssrArr) => {
    const ssrPrefix = 'ssr://';
    
    const parseArg = (argStr, prefix) => {
        return parseBase64(argStr.substr(prefix.length) || '');
    };

    return ssrArr.map(ssr => {
        if (!ssr) {
            return null;
        }
        return parseBase64(ssr.substr(ssrPrefix.length));
    })
    .map(proxyStr => {
        if (!proxyStr) {
            return null;
        }
        const [ip, port, protocol, method, obfs, argBase64] = proxyStr.split(':');
        const [pwdBase64, paramBase64] = argBase64.split('/?');
        const [obfsparamBase64, remarksBase64, groupBase64] = paramBase64.split('&');
        const obfsparam = parseArg(obfsparamBase64, 'obfsparam=');
        const remarks = parseArg(remarksBase64, 'remarks=');
        const group = parseArg(groupBase64, 'group=');
        return {
            ip, port, protocol, method, obfs,
            pwd: new Buffer(pwdBase64, 'base64').toString('utf8'),
            params: {
                obfsparam,
                remarks,
                group
            }
        };
    })
    .filter(options => !!options);
};

const main = () => {
    http.get(url, (res) => {
        const { statusCode } = res;
        if (statusCode >= 400) {
            throw new Error(`Request Failed.\n Status Code: ${statusCode}`);
        }
        console.log(statusCode);
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            const parsedData = parseBase64(rawData);
            const proxyOptions = parseSsrArray(parsedData.split('\n').slice(1));
    
            fs.writeFileSync(localFilepath, JSON.stringify(proxyOptions, null, 2));
        });
    }).on('error', err => {
        console.error(err);
    });
};

main();
