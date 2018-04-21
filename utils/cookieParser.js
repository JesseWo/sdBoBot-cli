'use strict'

module.exports = {
    parse: (cookieStr) => {
        let cookieObj = {};
        if (cookieStr) {
            let cookieArr = cookieStr.split(';');
            for (const item of cookieArr) {
                let kvArr = item.trim().split('=');
                cookieObj[kvArr[0]] = kvArr[1];
            }
        }
        return cookieObj;
    },
    format: (cookieObj) => {
        let arr = [];
        if (cookieObj) {
            for (const key in cookieObj) {
                if (cookieObj.hasOwnProperty(key)) {
                    const value = cookieObj[key];
                    arr.push(`${key}=${value}`);
                }
            }
            return arr.join('; ');
        }
    }
}